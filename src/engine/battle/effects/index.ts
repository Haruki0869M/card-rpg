// ===== 効果の部品の登録表と、共通の処理（対象の決め方・ダメージの与え方） =====
// 新しい効果: kinds/ にファイルを1つ置いて export const effect: EffectHandler<'種類'> = {...} と書くだけ。
// カード・敵の行動・消費アイテム・特殊能力のデータから、その日から使える。
import type { AbilityDef, BattleEvent, BattleState, CardDef, Effect, EffectKind, EffectTarget } from '../../../types';
import { coverChance, damageModifiers, fireAbilities } from '../../abilities';
import type { Rng } from '../../rng';
import { BALANCE } from '../../../data/balance';
import { getElement } from '../../../data/elements';
import { getEnemy } from '../../../data/enemies';
import { getStatus } from '../../../data/statuses';
import { absorb, calcDamage } from '../damage';
import { addStatus } from '../statuses';
import { abilityTriggered, addLog, afterHpLoss, findAlly, foesOf, isEnemy, nameOf, sideOf, type Unit, unitIdOf } from '../units';
import type { EffectCtx, EffectHandler } from './types';

export type { EffectCtx, EffectHandler } from './types';

const HANDLERS = new Map<string, EffectHandler>();
for (const [path, mod] of Object.entries(import.meta.glob('./kinds/*.ts', { eager: true }) as Record<string, { effect?: EffectHandler }>).sort(([a], [b]) => a.localeCompare(b))) {
  const h = mod.effect;
  if (!h) throw new Error(`effect file without "export const effect": ${path}`);
  if (HANDLERS.has(h.kind)) throw new Error(`Duplicate effect kind: ${h.kind}`);
  HANDLERS.set(h.kind, h as EffectHandler);
}

/** 効果の種類の処理（未登録ならエラー） */
export function effectHandler(kind: string): EffectHandler {
  const h = HANDLERS.get(kind);
  if (!h) throw new Error(`Unknown effect kind: ${kind}`);
  return h;
}
export const hasEffectKind = (kind: string) => HANDLERS.has(kind);
export const effectKinds = () => [...HANDLERS.keys()] as EffectKind[];

/** 効果の対象（省略時は種類ごとの既定） */
export const targetOf = (e: Effect): EffectTarget => e.to ?? effectHandler(e.kind).defaultTo;

export function makeCtx(
  state: BattleState,
  rng: Rng,
  events: BattleEvent[],
  source: Unit,
  opts: { target?: Unit; card?: CardDef; cardAbilities?: AbilityDef[]; dealt?: number; depth?: number; perfect?: boolean } = {},
): EffectCtx {
  return {
    state,
    rng,
    events,
    source,
    target: opts.target,
    card: opts.card,
    cardAbilities: opts.cardAbilities,
    perfect: opts.perfect,
    dealt: opts.dealt ?? 0,
    parts: [],
    hitIds: [],
    fired: [],
    depth: opts.depth ?? 0,
  };
}

/** 対象を決める（生存しているユニットだけ） */
export function resolveTargets(ctx: EffectCtx, to: EffectTarget): Unit[] {
  const { state, source } = ctx;
  switch (to) {
    case 'self':
      return source.dead ? [] : [source];
    case 'allies':
      return sideOf(state, source);
    case 'otherAllies':
      return sideOf(state, source).filter((u) => u !== source);
    case 'foes':
      return foesOf(state, source);
    case 'lowestAlly': {
      // 味方で、HPの割合が一番低い1人
      const alive = sideOf(state, source).filter((u) => !u.dead);
      return alive.length ? [alive.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a))] : [];
    }
    case 'randomFoe': {
      const alive = foesOf(state, source);
      return alive.length ? [alive[ctx.rng.int(alive.length)]] : [];
    }
    case 'randomAlly': {
      const alive = sideOf(state, source).filter((u) => !u.dead);
      return alive.length ? [alive[ctx.rng.int(alive.length)]] : [];
    }
    case 'target': {
      if (ctx.card?.target === 'allEnemies') return foesOf(state, source);
      // 敵の行動: 挑発や味方の戦闘不能で対象が変わるので、毎回インテントを読み直す
      const t = isEnemy(source) && source.intent ? findAlly(state, source.intent.targetId ?? '') : ctx.target;
      return t && !t.dead ? [t] : [];
    }
  }
}

/** 効果を1つ使う。何か起きたら true */
export function applyEffect(ctx: EffectCtx, e: Effect): boolean {
  return effectHandler(e.kind).apply(ctx, e as never);
}

/** アイテムとして使えるか（使えなければ理由） */
export function checkEffect(ctx: EffectCtx, e: Effect): string | null {
  return effectHandler(e.kind).check?.(ctx, e as never) ?? null;
}

const WHO: Record<EffectTarget, { ally: string; enemy: string }> = {
  target: { ally: '対象に', enemy: '対象に' },
  self: { ally: '自分に', enemy: '自分に' },
  allies: { ally: '味方全員に', enemy: '敵全員に' },
  otherAllies: { ally: '他の味方全員に', enemy: '他の敵全員に' },
  foes: { ally: '敵全員に', enemy: '味方全員に' },
  randomFoe: { ally: 'ランダムな敵1体に', enemy: 'ランダムな味方1人に' },
  lowestAlly: { ally: 'HPが一番低い味方に', enemy: 'HPが一番低い敵に' },
  randomAlly: { ally: 'ランダムな味方1人に', enemy: 'ランダムな敵1体に' },
};

/** 効果の説明文（side = 使う側。味方なら「敵全員に」、敵なら「味方全員に」） */
export function describeEffect(e: Effect, side: 'ally' | 'enemy' = 'ally', card?: CardDef): string {
  const to = targetOf(e);
  const who = to === 'target' && card?.target === 'allEnemies' ? WHO.foes[side] : WHO[to][side];
  return effectHandler(e.kind).describe(e as never, who);
}

/** カードの短い表示の数値 */
export const effectShort = (e: Effect): string => effectHandler(e.kind).short?.(e as never) ?? '';

/** 強化した効果 */
export function upgradeEffect(e: Effect): Effect {
  const h = effectHandler(e.kind);
  return h.upgrade ? (h.upgrade(e as never) as Effect) : e;
}

// ---------- 属性（弱点・耐性。spec §14） ----------

/** 属性のダメージ倍率（敵の弱点×1.5・耐性×0.5。無属性・味方は1） */
export function elementMultiplier(victim: Unit | undefined, element: string | undefined): number {
  if (!element || !victim || !isEnemy(victim)) return 1;
  const def = getEnemy(victim.defId);
  if (def.resist?.includes(element)) return BALANCE.elementResistMul;
  if (def.weak?.includes(element)) return BALANCE.elementWeakMul;
  return 1;
}

/** 連携攻撃（M3-C5）: このターンに別の味方が攻撃した敵には、ダメージが上乗せされる */
export const COMBO_NAME = '連携';
export function comboMultiplier(source: Unit | undefined, victim: Unit | undefined): number {
  if (!source || !victim || isEnemy(source) || !isEnemy(victim)) return 1;
  const id = unitIdOf(source);
  return victim.hitBy?.some((x) => x !== id) ? 1 + BALANCE.comboBonus : 1;
}

/** 属性を強める状態異常（聖光など）の倍率。使った分は消す */
function elementBoost(source: Unit, element: string): number {
  let m = 1;
  for (const [id, n] of Object.entries(source.statuses)) {
    if (!n) continue;
    const b = getStatus(id).boostElement;
    if (b?.element !== element) continue;
    m *= 1 + b.per * n;
    source.statuses[id] = 0;
  }
  return m;
}

/** その属性に耐性があるか（状態異常が効かない） */
export const resistsElement = (victim: Unit, element: string) => isEnemy(victim) && !!getEnemy(victim.defId).resist?.includes(element);

// ---------- ダメージ（ダメージの効果・特殊能力から使う） ----------

/**
 * victim にダメージを与える。倍率（敵のレベル・特殊能力・状態異常）、ブロック、かばう、戦闘不能まで処理する。
 * HPに入った量を返す
 */
export function dealDamage(ctx: EffectCtx, victim: Unit, base: number, element?: string): number {
  const { state, rng, events, source } = ctx;
  if (victim.dead) return 0;
  // 武器に宿った属性: 属性の無い物理攻撃がその属性になる（妖精の泉）
  if (!element && !isEnemy(source) && source.weaponElement && ctx.card?.category === 'physical') element = source.weaponElement;
  let v = victim;
  let mods = damageModifiers(state, source, ctx.card, v, ctx.cardAbilities, ctx.perfect);
  // 属性を強める状態異常（聖光など）: この一撃で使い切る
  const boost = element ? elementBoost(source, element) : 1;
  base = Math.round(base * boost);
  let dmg = calcDamage(base, source.statuses, v.statuses, mods.multiplier * elementMultiplier(v, element) * comboMultiplier(source, v));
  // かばう: 相手の攻撃でこのままだとHP0になる場合、同じ側の他の仲間が確率で代わりに受ける
  if (isEnemy(source) !== isEnemy(v) && dmg - (mods.ignoreBlock ? 0 : v.block) >= v.hp) {
    for (const other of sideOf(state, v)) {
      if (other === v) continue;
      const cov = coverChance(other);
      if (!cov) continue;
      if (rng.next() * 100 < cov.chance) {
        abilityTriggered(state, unitIdOf(other), cov.name, events);
        addLog(state, `${nameOf(other)}の「${cov.name}」！ ${nameOf(v)}をかばった`);
        v = other;
        mods = damageModifiers(state, source, ctx.card, v, ctx.cardAbilities, ctx.perfect);
        dmg = calcDamage(base, source.statuses, v.statuses, mods.multiplier * elementMultiplier(v, element) * comboMultiplier(source, v));
        break;
      }
    }
  }
  for (const n of mods.active) if (!ctx.fired.includes(n)) ctx.fired.push(n);
  if (comboMultiplier(source, v) > 1 && !ctx.fired.includes(COMBO_NAME)) ctx.fired.push(COMBO_NAME);
  // 連携攻撃の記録（このターンにこの敵を攻撃した味方）
  if (isEnemy(v) && !isEnemy(source)) {
    const id = unitIdOf(source);
    if (!(v.hitBy ??= []).includes(id)) v.hitBy.push(id);
  }
  if (mods.ignoreBlock && v.block > 0 && mods.ignoreBlockName && !ctx.fired.includes(mods.ignoreBlockName)) ctx.fired.push(mods.ignoreBlockName);
  const r = absorb(dmg, mods.ignoreBlock ? 0 : v.block, v.hp);
  if (!mods.ignoreBlock) v.block = r.block;
  v.hp = r.hp;
  events.push({ type: 'damage', unitId: unitIdOf(v), amount: r.hpLoss, blocked: r.blocked, sourceId: unitIdOf(source) });
  if (isEnemy(v)) state.stats.totalDamage += r.hpLoss;
  ctx.dealt += r.hpLoss;
  if (isEnemy(source) !== isEnemy(v) && !ctx.hitIds.includes(unitIdOf(v))) ctx.hitIds.push(unitIdOf(v));
  afterHpLoss(state, v, rng, events);
  // 属性の状態異常（HPに当たった時。完全成功なら必ず。耐性があれば効かない）
  if (element && r.hpLoss > 0 && !v.dead) {
    const el = getElement(element);
    if (el.status && !resistsElement(v, element) && (ctx.perfect || rng.next() * 100 < (el.chance ?? 0))) {
      addStatus(v.statuses, el.status, el.amount ?? 1);
      events.push({ type: 'status', unitId: unitIdOf(v), status: el.status, amount: el.amount ?? 1 });
      ctx.parts.push(`${getStatus(el.status).name}${el.amount ?? 1}`);
    }
  }
  // 転職の条件の記録: 味方が敵を倒した（属性・呪い・自分のHPが少ない時）
  if (v.dead && isEnemy(v) && !isEnemy(source)) {
    const f = (source.feats ??= {});
    const add = (k: string) => (f[k] = (f[k] ?? 0) + 1);
    add('kills');
    if (element) add('kills:element');
    if ((v.statuses.curse ?? 0) > 0) add('kills:cursed');
    if (source.hp <= source.maxHp * 0.3) add('kills:lowHp');
    if (getEnemy(v.defId).size !== undefined && getEnemy(v.defId).size! >= 1.3) add('kills:big');
  }
  // きっかけ: ダメージを受けた / 倒した
  if (ctx.depth < 3) {
    if (r.hpLoss > 0 && !v.dead) fireAbilities(state, rng, events, v, 'hurt', { depth: ctx.depth + 1 });
    if (v.dead && isEnemy(source) !== isEnemy(v) && !source.dead) fireAbilities(state, rng, events, source, 'kill', { target: v, depth: ctx.depth + 1 });
  }
  return r.hpLoss;
}
