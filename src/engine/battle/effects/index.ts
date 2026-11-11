// ===== 効果の部品の登録表と、共通の処理（対象の決め方・ダメージの与え方） =====
// 新しい効果: kinds/ にファイルを1つ置いて export const effect: EffectHandler<'種類'> = {...} と書くだけ。
// カード・敵の行動・消費アイテム・特殊能力のデータから、その日から使える。
import type { AbilityDef, BattleEvent, BattleState, CardDef, Effect, EffectTarget, EnemyState } from '../../../types';
import { convertedElement, coverChance, damageModifiers, elementGuardOf, fireAbilities } from '../../abilities';
import type { Rng } from '../../rng';
import { BALANCE } from '../../../data/balance';
import { getElement } from '../../../data/elements';
import { getEnemy, getEnemyAction } from '../../../data/enemies';
import { getStatus } from '../../../data/statuses';
import { absorb, calcDamage } from '../damage';
import { addStatus } from '../statuses';
import { attackElement } from '../cardState';
import { abilityTriggered, addLog, afterHpLoss, findAlly, foesOf, healUnit, isEnemy, nameOf, sideOf, type Unit, unitIdOf } from '../units';
import { recordActivation, type EffectCtx, type EffectHandler } from './types';

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

/** 効果の対象（省略時は種類ごとの既定） */
export const targetOf = (e: Effect): EffectTarget => e.to ?? effectHandler(e.kind).defaultTo;

export function makeCtx(
  state: BattleState,
  rng: Rng,
  events: BattleEvent[],
  source: Unit,
  opts: { target?: Unit; allyTarget?: Unit; attacker?: Unit; card?: CardDef; cardAbilities?: AbilityDef[]; dealt?: number; depth?: number; perfect?: boolean; tierEffects?: Effect[] } = {},
): EffectCtx {
  return {
    state,
    rng,
    events,
    source,
    target: opts.target,
    allyTarget: opts.allyTarget,
    attacker: opts.attacker,
    card: opts.card,
    cardAbilities: opts.cardAbilities,
    perfect: opts.perfect,
    tierEffects: opts.tierEffects,
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
    case 'allyTarget':
      return ctx.allyTarget && !ctx.allyTarget.dead ? [ctx.allyTarget] : [];
    case 'self':
      return source.dead ? [] : [source];
    case 'allies':
      return sideOf(state, source);
    case 'otherAllies':
      return sideOf(state, source).filter((u) => u !== source);
    case 'foes':
      return foesOf(state, source);
    case 'attacker':
      // 攻撃してきた相手（ダメージを受けた時・防いだ時のきっかけ。毒などの継続ダメージには相手がいない）
      return ctx.attacker && !ctx.attacker.dead && isEnemy(ctx.attacker) !== isEnemy(source) ? [ctx.attacker] : [];
    case 'otherFoes':
      // 狙った敵以外の敵全員（感電など）
      return foesOf(state, source).filter((u) => u !== ctx.target);
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
  allyTarget: { ally: '選んだ味方に', enemy: '選んだ敵に' },
  self: { ally: '自分に', enemy: '自分に' },
  allies: { ally: '味方全員に', enemy: '敵全員に' },
  otherAllies: { ally: '他の味方全員に', enemy: '他の敵全員に' },
  foes: { ally: '敵全員に', enemy: '味方全員に' },
  otherFoes: { ally: '他の敵全員に', enemy: '他の味方全員に' },
  attacker: { ally: '攻撃してきた相手に', enemy: '攻撃してきた相手に' },
  randomFoe: { ally: 'ランダムな敵1体に', enemy: 'ランダムな味方1人に' },
  lowestAlly: { ally: 'HPが一番低い味方に', enemy: 'HPが一番低い敵に' },
  randomAlly: { ally: 'ランダムな味方1人に', enemy: 'ランダムな敵1体に' },
};

/** 効果の説明文（side = 使う側。味方なら「敵全員に」、敵なら「味方全員に」） */
export function describeEffect(e: Effect, side: 'ally' | 'enemy' = 'ally', card?: CardDef): string {
  const to = targetOf(e);
  const who = to === 'target' && card?.target === 'allEnemies' ? WHO.foes[side] : to === 'target' && card && ['ally', 'otherAlly', 'fallenAlly'].includes(card.target) ? '選んだ味方に' : WHO[to][side];
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
/** 連携の段階の名前（1 = 連携 / 2 = 大連携 / 3 = 極連携） */
export const COMBO_NAMES = ['', '連携', '大連携', '極連携'] as const;
/** 連携の段階: このターンに、その敵を先に攻撃した「別の味方」の人数（上限は表の長さ。0 = 連携なし） */
export function comboStage(source: Unit | undefined, victim: Unit | undefined): number {
  if (!source || !victim || isEnemy(source) || !isEnemy(victim)) return 0;
  const id = unitIdOf(source);
  return Math.min(BALANCE.comboBonus.length - 1, victim.hitBy?.filter((x) => x !== id).length ?? 0);
}
/** 連携の段階の上乗せ（0.2 / 0.35 / 0.5） */
export const comboBonusOf = (stage: number) => BALANCE.comboBonus[Math.max(0, Math.min(BALANCE.comboBonus.length - 1, stage))] ?? 0;
export function comboMultiplier(source: Unit | undefined, victim: Unit | undefined): number {
  return 1 + comboBonusOf(comboStage(source, victim));
}

// ---------- BREAK（大技の予告を崩す。抜本的な見直し §3-2） ----------

/** その敵が今、大技の予告を出しているか（崩せる状態か。もう崩した・倒れた・予告が無い時は false） */
export function canBreak(enemy: Unit | undefined): boolean {
  if (!enemy || !isEnemy(enemy) || enemy.dead || enemy.broken || !enemy.intent) return false;
  return !!getEnemyAction(enemy.defId, enemy.intent.actionId).big;
}

/** 大技の予告を崩す: 威力が半分・弱体1・ブロック0（オーナーの決定 3-A）。乱数は使わない */
function breakEnemy(ctx: EffectCtx, enemy: EnemyState, why: 'weak' | 'perfect' | 'damage') {
  enemy.broken = true;
  enemy.nextActionMultiplier = (enemy.nextActionMultiplier ?? 1) * BALANCE.breakPower;
  enemy.block = 0;
  ctx.events.push({ type: 'break', enemyUid: enemy.uid, why });
  addStatus(enemy.statuses, 'weak', BALANCE.breakWeak);
  ctx.events.push({ type: 'status', unitId: enemy.uid, status: 'weak', amount: BALANCE.breakWeak });
  ctx.parts.push('BREAK！');
  addLog(ctx.state, `⚡BREAK！ ${nameOf(enemy)}の体勢が崩れた（次の行動の威力が半分・弱体${BALANCE.breakWeak}・ブロック0）`);
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
export function dealDamage(ctx: EffectCtx, victim: Unit, base: number, element?: string, extraMultiplier = 1): number {
  const { state, rng, events, source } = ctx;
  if (victim.dead) return 0;
  // 武器に宿った属性: 属性の無い物理攻撃がその属性になる（妖精の泉）
  element = convertedElement(source, ctx.card, attackElement(source, ctx.card, element));
  let v = victim;
  let mods = damageModifiers(state, source, ctx.card, v, ctx.cardAbilities, ctx.perfect, element);
  // 属性を強める状態異常（聖光など）: この一撃で使い切る
  const boost = element ? elementBoost(source, element) : 1;
  base = Math.round(base * boost);
  let dmg = calcDamage(base, source.statuses, v.statuses, extraMultiplier * mods.multiplier * elementMultiplier(v, element) * comboMultiplier(source, v));
  // かばう: 相手の攻撃でこのままだとHP0になる場合、同じ側の他の仲間が確率で代わりに受ける
  if (isEnemy(source) !== isEnemy(v) && dmg - (mods.ignoreBlock ? 0 : v.block) >= v.hp) {
    for (const other of sideOf(state, v)) {
      if (other === v) continue;
      const cov = coverChance(other);
      if (!cov) continue;
      if (rng.next() * 100 < cov.chance) {
        abilityTriggered(state, unitIdOf(other), cov.name, events, cov.source);
        addLog(state, `${nameOf(other)}の「${cov.name}」！ ${nameOf(v)}をかばった`);
        v = other;
        mods = damageModifiers(state, source, ctx.card, v, ctx.cardAbilities, ctx.perfect, element);
        dmg = calcDamage(base, source.statuses, v.statuses, extraMultiplier * mods.multiplier * elementMultiplier(v, element) * comboMultiplier(source, v));
        break;
      }
    }
  }
  for (const n of mods.active) recordActivation(ctx, n);
  const stage = comboStage(source, v);
  if (stage > 0) recordActivation(ctx, { name: COMBO_NAMES[stage] ?? COMBO_NAME, source: { kind: 'other' } });
  // 弱点の属性で攻撃したか（BREAK のきっかけ。かばう・属性の変換の後の、実際の相手と属性で見る）
  const weakHit = !!element && isEnemy(v) && !!getEnemy(v.defId).weak?.includes(element);
  // 連携攻撃の記録（このターンにこの敵を攻撃した味方）
  if (isEnemy(v) && !isEnemy(source)) {
    const id = unitIdOf(source);
    if (!(v.hitBy ??= []).includes(id)) v.hitBy.push(id);
  }
  if (mods.ignoreBlock && v.block > 0 && mods.ignoreBlockNotice) recordActivation(ctx, mods.ignoreBlockNotice);
  if (!isEnemy(v) && dmg > 0 && isEnemy(source)) {
    if (v.airborne) return 0;
    const shield = v.summons?.findIndex(s => s.intercept) ?? -1;
    if (shield >= 0) {
      const [s] = v.summons!.splice(shield, 1);
      abilityTriggered(state, v.id, s.name, events, { kind: 'summon', id: s.id, label: s.name });
      events.push({ type: 'damage', unitId: v.id, amount: 0, blocked: dmg, sourceId: unitIdOf(source) });
      return 0;
    }
  }
  // 属性の守り（無効・吸収・半減）。敵の攻撃から味方を守る
  const guard = isEnemy(source) !== isEnemy(v) ? elementGuardOf(v, element) : undefined;
  if (guard) {
    const guarded = guard === 'half' ? Math.floor(dmg / 2) : 0;
    if (guard === 'absorb' && dmg > 0) {
      const healed = healUnit(v, dmg, events);
      if (healed > 0) ctx.parts.push(`${healed}吸収`);
    }
    dmg = guarded;
  }
  const r = absorb(dmg, mods.ignoreBlock ? 0 : v.block, v.hp);
  if (!mods.ignoreBlock) v.block = r.block;
  v.hp = r.hp;
  events.push({ type: 'damage', unitId: unitIdOf(v), amount: r.hpLoss, rawAmount: dmg, blocked: r.blocked, sourceId: unitIdOf(source) });
  if (isEnemy(v)) state.stats.totalDamage += r.hpLoss;
  ctx.dealt += r.hpLoss;
  if (isEnemy(source) !== isEnemy(v) && !ctx.hitIds.includes(unitIdOf(v))) ctx.hitIds.push(unitIdOf(v));
  afterHpLoss(state, v, rng, events);
  // BREAK: 大技の予告を出している敵に、弱点の属性で攻撃／完全成功で攻撃／このターンの合計ダメージが最大HPの2割以上
  if (isEnemy(v) && !isEnemy(source)) {
    v.turnDamage = (v.turnDamage ?? 0) + r.hpLoss;
    if (dmg > 0 && canBreak(v)) {
      const why = weakHit ? 'weak' : ctx.perfect && ctx.card ? 'perfect' : v.turnDamage * 100 >= v.maxHp * BALANCE.breakDamagePct ? 'damage' : undefined;
      if (why) breakEnemy(ctx, v, why);
    }
  }
  // 属性の状態異常（HPに当たった時。完全成功なら必ず。耐性があれば効かない）
  if (element && r.hpLoss > 0 && !v.dead) {
    const el = getElement(element);
    if (el.status && !resistsElement(v, element) && (ctx.perfect || rng.next() * 100 < (el.chance ?? 0))) {
      addStatus(v.statuses, el.status, el.amount ?? 1);
      events.push({ type: 'status', unitId: unitIdOf(v), status: el.status, amount: el.amount ?? 1 });
      ctx.parts.push(`${getStatus(el.status).name}${el.amount ?? 1}`);
      // きっかけ: 相手に状態異常を与えた
      if (ctx.depth < 3 && isEnemy(source) !== isEnemy(v) && !source.dead) fireAbilities(state, rng, events, source, 'inflict', { target: v, statusId: el.status, depth: ctx.depth + 1 });
    }
  }
  // 転職の条件の記録: 味方が敵を倒した（属性・呪い・自分のHPが少ない時）
  if (v.dead && isEnemy(v) && !isEnemy(source)) {
    const f = (source.feats ??= {});
    const add = (k: string) => (f[k] = (f[k] ?? 0) + 1);
    add('kills');
    if (source.equippedWeaponType) add(`kills:weapon:${source.equippedWeaponType}`);
    if (element) add('kills:element');
    if ((v.statuses.curse ?? 0) > 0) add('kills:cursed');
    if (Object.entries(v.statuses).some(([id, n]) => n > 0 && getStatus(id).harmful)) add('kills:status');
    if (source.hp <= source.maxHp * 0.3) add('kills:lowHp');
    if (getEnemy(v.defId).size !== undefined && getEnemy(v.defId).size! >= 1.3) add('kills:big');
  }
  // きっかけ: ダメージを受けた / 倒した
  if (ctx.depth < 3) {
    if (r.hpLoss > 0 && !v.dead) fireAbilities(state, rng, events, v, 'hurt', { attacker: source, depth: ctx.depth + 1 });
    // きっかけ: 相手の攻撃を、ブロックで完全に防いだ
    if (r.hpLoss === 0 && r.blocked > 0 && !v.dead && isEnemy(source) !== isEnemy(v)) fireAbilities(state, rng, events, v, 'blocked', { attacker: source, depth: ctx.depth + 1 });
    if (v.dead && isEnemy(source) !== isEnemy(v) && !source.dead) fireAbilities(state, rng, events, source, 'kill', { target: v, depth: ctx.depth + 1 });
    if (v.dead && isEnemy(v) && !isEnemy(source)) for (const a of state.allies) if (!a.dead) fireAbilities(state, rng, events, a, 'allyKill', { target: v, depth: ctx.depth + 1 });
  }
  return r.hpLoss;
}
