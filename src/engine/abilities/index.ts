// ===== 特殊能力（職業・装備・カード・敵で共通。spec §2.4・§6.2・§12.7・§13.1） =====
// 能力はデータ（きっかけ＋条件＋効果 / 常時型）で書く。ここは共通の処理だけ。
//  - 新しい条件: conditions/ にファイルを1つ置く
//  - 新しい効果: src/engine/battle/effects/kinds/ にファイルを1つ置く
//  - 職業IDや能力名による分岐は書かない
import { getClass } from '../../data/classes';
import { getElement } from '../../data/elements';
import { getEnemy } from '../../data/enemies';
import { getStatus } from '../../data/statuses';
import type { AbilityCondition, AbilityDef, AbilityNotice, AbilitySource, AbilityEffect, AbilityTrigger, BattleEvent, BattleState, CardDef, DamageScale, Effect } from '../../types';
import { applyEffect, describeEffect, makeCtx } from '../battle/effects';
import { abilityTriggered, addLog, isEnemy, nameOf, type Unit, unitIdOf } from '../battle/units';
import type { Rng } from '../rng';
import type { CondCtx, ConditionHandler } from './conditions/types';

export type { CondCtx, ConditionHandler } from './conditions/types';

const CONDITIONS = new Map<string, ConditionHandler>();
for (const [path, mod] of Object.entries(import.meta.glob('./conditions/*.ts', { eager: true }) as Record<string, { condition?: ConditionHandler }>).sort(([a], [b]) => a.localeCompare(b))) {
  const h = mod.condition;
  if (!h) continue; // types.ts など
  if (CONDITIONS.has(h.kind)) throw new Error(`Duplicate condition kind: ${h.kind} (${path})`);
  CONDITIONS.set(h.kind, h as ConditionHandler);
}

export function conditionHandler(kind: string): ConditionHandler {
  const h = CONDITIONS.get(kind);
  if (!h) throw new Error(`Unknown condition kind: ${kind}`);
  return h;
}
export const hasConditionKind = (kind: string) => CONDITIONS.has(kind);

/** 条件をすべて満たすか（上から順に判定。確率の条件はここで乱数を使う） */
export function testConditions(conds: AbilityCondition[] | undefined, c: CondCtx): boolean {
  for (const cond of conds ?? []) if (!conditionHandler(cond.kind).test(c, cond as never)) return false;
  return true;
}

/** ユニットが持つ戦闘の特殊能力（味方 = 職業 + 装備、敵 = 敵のデータ） */
export function abilitiesOf(u: Unit): AbilityDef[] {
  if (isEnemy(u)) return (getEnemy(u.defId).abilities ?? []).map(a => ({ ...a, source: { kind: 'enemy', id: u.defId, label: getEnemy(u.defId).name } }));
  const def = getClass(u.classId), own: AbilityDef = { ...def.battleAbility, source: { kind: 'job', id: def.id, label: def.name } };
  return [own, ...(u.abilities ?? []).map(a => a.source ? a : { ...a, source: a.pet && u.pet ? { kind: 'pet' as const, id: u.pet.petId, label: u.pet.name } : { kind: 'other' as const } })];
}

const isTriggered = (e: AbilityEffect): e is Extract<AbilityEffect, { when: AbilityTrigger }> => 'when' in e;

// ---------- 常時型 ----------

export interface DamageMods {
  multiplier: number;
  /** 働いた倍率の能力の名前 */
  active: AbilityNotice[];
  ignoreBlock: boolean;
  ignoreBlockNotice?: AbilityNotice;
}

/**
 * source が victim に与えるダメージの倍率（敵のレベル × 常時型の能力）とブロック無視。
 * cardAbilities = 使っているカードの特殊能力（そのカードだけで働く）。予測表示でも同じ関数を使う
 */
export function damageModifiers(state: BattleState | undefined, source: Unit, card: CardDef | undefined, victim: Unit | undefined, cardAbilities?: AbilityDef[], perfect?: boolean, element?: string): DamageMods {
  const out: DamageMods = { multiplier: isEnemy(source) ? source.attackMul : 1 + (source.damageBonus ?? 0), active: [], ignoreBlock: false };
  const c: CondCtx = { state, self: source, card, target: victim, perfect };
  for (const ab of cardAbilities?.length ? [...abilitiesOf(source), ...cardAbilities] : abilitiesOf(source)) {
    const e = ab.effect;
    if (!('modifier' in e)) continue;
    if (e.modifier === 'weaknessDamage') {
      const el = element ?? (card?.category === 'physical' && !isEnemy(source) ? source.weaponElement : undefined);
      if (el && victim && isEnemy(victim) && getEnemy(victim.defId).weak?.includes(el) && !getEnemy(victim.defId).resist?.includes(el) && testConditions(e.if, c)) {
        out.multiplier *= e.multiplier;
        out.active.push({ name: ab.name, source: ab.source ?? { kind: 'card', id: card?.id, label: card?.name } });
      }
      continue;
    }
    if (e.modifier !== 'damageDealt' && e.modifier !== 'ignoreBlock') continue;
    if (!testConditions(e.if, c)) continue;
    if (e.modifier === 'damageDealt') {
      const m = e.multiplier * scaleOf(e.scale, source, victim);
      if (m === 1) continue;
      out.multiplier *= m;
      out.active.push({ name: ab.name, source: ab.source ?? { kind: 'card', id: card?.id, label: card?.name } });
    } else if (e.modifier === 'ignoreBlock') {
      out.ignoreBlock = true;
      out.ignoreBlockNotice ??= { name: ab.name, source: ab.source ?? { kind: 'card', id: card?.id, label: card?.name } };
    }
  }
  return out;
}

/** 属性 element の攻撃を受ける時の守り（無効・吸収・半減）。複数あれば無効 > 吸収 > 半減 */
export function elementGuardOf(victim: Unit, element: string | undefined): 'immune' | 'absorb' | 'half' | undefined {
  if (!element) return undefined;
  const modes = new Set<string>();
  for (const ab of abilitiesOf(victim)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'elementGuard' && e.element === element && testConditions(e.if, { self: victim })) modes.add(e.mode);
  }
  return modes.has('immune') ? 'immune' : modes.has('absorb') ? 'absorb' : modes.has('half') ? 'half' : undefined;
}

/** 属性の無い物理攻撃を別の属性に変える能力（convertElement）。無ければそのまま */
export function convertedElement(source: Unit, card: CardDef | undefined, element: string | undefined): string | undefined {
  if (element || isEnemy(source) || card?.category !== 'physical') return element;
  for (const ab of abilitiesOf(source)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'convertElement' && testConditions(e.if, { self: source, card })) return e.into;
  }
  return element;
}

/** 倍率の上乗せ（状況で増える分。1 = 上乗せ無し） */
function scaleOf(sc: DamageScale | undefined, self: Unit, target: Unit | undefined): number {
  if (!sc) return 1;
  let v = 0;
  if (sc.by === 'missingHp') v = 1 - Math.max(0, self.hp) / Math.max(1, self.maxHp);
  else if (sc.by === 'targetStatuses') v = target ? Object.entries(target.statuses).filter(([id, n]) => (n ?? 0) > 0 && getStatus(id).harmful).length : 0;
  else if (sc.by === 'selfStatus') v = sc.status ? (self.statuses[sc.status] ?? 0) : 0;
  else if (sc.by === 'gold') v = Math.floor(((self as { gold?: number }).gold ?? 0) / Math.max(1, sc.step ?? 1));
  const add = sc.per * v;
  return 1 + (sc.max !== undefined ? Math.min(sc.max, add) : add);
}

/** カードの成功率の上乗せ（狙い撃ちなど。常時型 cardChance の合計） */
export function cardChanceBonus(u: Unit, card: CardDef): number {
  let n = 0;
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'cardChance' && testConditions(e.if, { self: u, card })) n += e.bonus;
  }
  return n;
}

/**
 * カードのコスト（常時型 cardCost を全部当てた後。0より下にはならない）。
 * keys = 効いた「1ターンに1枚だけ」の能力の数えの名前（カードを使った時に markCostUsed で数える）。ここでは何も書き換えない
 */
export function cardCostOf(state: BattleState | undefined, u: Unit, card: CardDef): { cost: number; keys: string[]; active: AbilityNotice[] } {
  let cost = card.cost;
  const keys: string[] = [], active: AbilityNotice[] = [];
  if (isEnemy(u)) return { cost, keys, active };
  const counters = (u as { counters?: Record<string, number> }).counters ?? {};
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if (!('modifier' in e) || e.modifier !== 'cardCost') continue;
    if (e.turnKey && counters[`once:${e.turnKey}`] === (state?.turn ?? 0)) continue;
    if (!testConditions(e.if, { state, self: u, card })) continue;
    const next = Math.max(0, e.set !== undefined ? Math.min(cost, e.set) : cost + (e.delta ?? 0));
    if (next === cost) continue;
    cost = next;
    if (e.turnKey) keys.push(e.turnKey);
    active.push({ name: ab.name, source: ab.source });
  }
  return { cost, keys, active };
}

/** コストを変えた「1ターンに1枚だけ」の能力を、このターンは使った事にする */
export function markCostUsed(state: BattleState, u: Unit, keys: string[]) {
  if (!keys.length) return;
  const counters = ((u as { counters?: Record<string, number> }).counters ??= {});
  for (const k of keys) counters[`once:${k}`] = state.turn;
}

/** 自分が付ける状態異常の量の上乗せ（呪詛など） */
export function statusBonusOf(u: Unit, status: string, card?: CardDef, target?: Unit): number {
  let n = 0;
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'statusBonus' && e.statuses.includes(status) && testConditions(e.if, { self: u, card, target })) n += e.amount;
  }
  return n;
}

/** ターンの始めに残るブロックの上限（不動の錨。持っていなければ0。複数あれば一番大きい物） */
export function keepBlockOf(u: Unit): number {
  let n = 0;
  for (const ab of abilitiesOf(u)) if ('modifier' in ab.effect && ab.effect.modifier === 'keepBlock') n = Math.max(n, ab.effect.max);
  return n;
}

/** 砲台・罠・召喚が2回ずつ発動する能力（永久機関）。持っていればその能力 */
export function summonTwiceOf(u: Unit): AbilityDef | undefined {
  return abilitiesOf(u).find((ab) => 'modifier' in ab.effect && ab.effect.modifier === 'summonTwice');
}

/** 回復した量をブロックにも変える能力（福音）。割合が一番大きい物 */
export function healToBlockOf(u: Unit): { pct: number; ability: AbilityDef } | undefined {
  let best: { pct: number; ability: AbilityDef } | undefined;
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'healToBlock' && (!best || e.pct > best.pct)) best = { pct: e.pct, ability: ab };
  }
  return best;
}

/** かばう能力の発動確率（複数あれば一番高いもの。持っていなければ null） */
export function coverChance(u: Unit): { chance: number; name: string; source?: AbilitySource } | null {
  let best: { chance: number; name: string; source?: AbilitySource } | null = null;
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'coverLethal' && (!best || e.chance > best.chance)) best = { chance: e.chance, name: ab.name, source: ab.source };
  }
  return best;
}

// ---------- 発動型 ----------

/**
 * きっかけ when で、owner の能力（または list の能力）を発動する。
 * 発動した能力の結果の短い表示（「能力名（結果）」）を返す
 */
export function fireAbilities(
  state: BattleState,
  rng: Rng,
  events: BattleEvent[],
  owner: Unit,
  when: AbilityTrigger,
  opts: { card?: CardDef; target?: Unit; allyTarget?: Unit; attacker?: Unit; dealt?: number; list?: AbilityDef[]; depth?: number; focusUsed?: number; statusId?: string; tierEffects?: Effect[]; perfect?: boolean; successes?: number; supportedOthers?: boolean } = {},
): string[] {
  const out: string[] = [];
  if (owner.dead && when !== 'hurt' && !(when === 'allyDown' && opts.target === owner)) return out;
  for (const ab of opts.list ?? abilitiesOf(owner)) {
    const e = ab.effect;
    if (!isTriggered(e) || e.when !== when) continue;
    if (!testConditions(e.if, { state, rng, self: owner, card: opts.card, target: opts.target, dealt: opts.dealt, focusUsed: opts.focusUsed, perfect: opts.perfect, successes: opts.successes, supportedOthers: opts.supportedOthers, statusId: opts.statusId })) continue;
    const ctx = makeCtx(state, rng, events, owner, { target: opts.target, allyTarget: opts.allyTarget, attacker: opts.attacker, card: opts.card, dealt: opts.dealt, depth: opts.depth, tierEffects: opts.tierEffects, perfect: opts.perfect, cardAbilities: opts.card?.trait ? [opts.card.trait] : undefined });
    let any = false;
    for (const eff of e.do) any = applyEffect(ctx, eff) || any;
    if (!any) continue;
    abilityTriggered(state, unitIdOf(owner), ab.name, events, ab.source ?? (opts.list ? { kind: 'card', id: opts.card?.id, label: opts.card?.name } : undefined));
    for (const n of ctx.fired) abilityTriggered(state, unitIdOf(owner), n.name, events, n.source);
    // お供の活躍の回数（戦績に出す）
    if (ab.pet) {
      const c = ((owner as { counters?: Record<string, number> }).counters ??= {});
      c.petActs = (c.petActs ?? 0) + 1;
    }
    const res = ctx.parts.join(' ');
    out.push(res ? `${ab.name}（${res}）` : ab.name);
    addLog(state, `${nameOf(owner)}の「${ab.name}」！ ${res}`);
  }
  return out;
}

// ---------- 説明文（データの中身から自動で作る） ----------

const TRIGGER_TEXT: Record<AbilityTrigger, string> = {
  battleStart: '戦闘開始時',
  turnStart: 'ターン開始時',
  turnEnd: 'ターン終了時',
  afterCard: 'カードを使った後',
  perfect: '完全成功時',
  kill: '敵を倒した時',
  hurt: 'ダメージを受けた時',
  allyKill: '味方が敵を倒した時',
  allyDown: '味方が倒れた時',
  blocked: '攻撃をブロックで完全に防いだ時',
  inflict: '敵に状態異常を与えた時',
  foeTick: '敵が継続ダメージを受けた時',
};

const condText = (conds?: AbilityCondition[]) => (conds ?? []).map((c) => conditionHandler(c.kind).describe(c as never));

/** 特殊能力の説明文。description があればそれを使う。side = 持ち主の側（効果の「敵全員」などの言い方） */
export function describeAbility(ab: AbilityDef, side: 'ally' | 'enemy' = 'ally'): string {
  if (ab.description) return ab.description;
  const e = ab.effect;
  if ('modifier' in e) {
    if (e.modifier === 'coverLethal') return `他の味方がHP0になるダメージを受ける時、${e.chance}%の確率で代わりに受ける（ブロックで防げる）`;
    if (e.modifier === 'keepBlock') return `ターンの始めに、前のターンのブロックが最大${e.max}まで残る`;
    if (e.modifier === 'summonTwice') return '自分の砲台・罠・召喚が2回ずつ発動する';
    if (e.modifier === 'healToBlock') return `HPを回復した時、回復した量の${Math.round(e.pct * 100)}%のブロックも得る`;
    const cs = condText(e.if);
    const head = cs.length ? `${cs.join('・')}：` : '';
    if (e.modifier === 'cardChance') return `${head}成功率+${e.bonus}%`;
    if (e.modifier === 'completeSlots') return `${head}残りの枠も全て成功する`;
    if (e.modifier === 'exhaust') return '1戦闘1回。使ったカードは戦闘が終わるまで山札から除く';
    if (e.modifier === 'slotPreview') return `1戦闘${e.uses}回、次のカードのスロットを先読みし、1回だけ振り直せる`;
    if (e.modifier === 'cardCost') return `${head}カードのコスト${e.set !== undefined ? `が${e.set}になる` : `${(e.delta ?? 0) > 0 ? '+' : ''}${e.delta ?? 0}`}${e.turnKey ? '（1ターンに1枚）' : ''}`;
    if (e.modifier === 'chestChance') return `宝箱の運の判定+${e.bonus}%`;
    if (e.modifier === 'elementGuard') return `${head}${getElement(e.element).name}属性のダメージを${e.mode === 'immune' ? '無効にする' : e.mode === 'absorb' ? '受けず、その分回復する' : '半分にする'}`;
    if (e.modifier === 'convertElement') return `${head}属性の無い物理攻撃が${getElement(e.into).name}属性になる`;
    if (e.modifier === 'weaknessDamage') return `${head}弱点属性のダメージ×${e.multiplier}`;
    if (e.modifier === 'statusBonus') return `${head}自分が付ける${e.statuses.map((x) => `「${getStatus(x).name}」`).join('')}+${e.amount}`;
    if (e.modifier === 'damageDealt') return `${head}${e.multiplier !== 1 ? `与えるダメージ×${e.multiplier}${e.scale ? '、さらに' : ''}` : ''}${e.scale ? scaleText(e.scale) : ''}`;
    return `${head}ダメージが敵のブロックを無視する`;
  }
  const cs = condText(e.if);
  return `${TRIGGER_TEXT[e.when]}${cs.length ? `（${cs.join('・')}）` : ''}：${e.do.map((x) => describeEffect(x, side)).join('、')}`;
}

function scaleText(sc: DamageScale): string {
  const pct = Math.round(sc.per * 100);
  const cap = sc.max !== undefined ? `（最大+${Math.round(sc.max * 100)}%）` : '';
  if (sc.by === 'missingHp') return `減ったHPが多いほど与えるダメージが増える${cap}`;
  if (sc.by === 'targetStatuses') return `対象の悪い状態異常1種類につき与えるダメージ+${pct}%${cap}`;
  if (sc.by === 'gold') return `所持金${sc.step ?? 1}Gごとに与えるダメージ+${pct}%${cap}`;
  return `自分の「${sc.status ? getStatus(sc.status).name : ''}」1つにつき与えるダメージ+${pct}%${cap}`;
}
