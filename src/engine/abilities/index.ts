// ===== 特殊能力（職業・装備・カード・敵で共通。spec §2.4・§6.2・§12.7・§13.1） =====
// 能力はデータ（きっかけ＋条件＋効果 / 常時型）で書く。ここは共通の処理だけ。
//  - 新しい条件: conditions/ にファイルを1つ置く
//  - 新しい効果: src/engine/battle/effects/kinds/ にファイルを1つ置く
//  - 職業IDや能力名による分岐は書かない
import { BALANCE } from '../../data/balance';
import { getClass } from '../../data/classes';
import { getElement } from '../../data/elements';
import { getEnemy } from '../../data/enemies';
import { getStatus } from '../../data/statuses';
import type { AbilityCondition, AbilityDef, AbilityNotice, AbilitySource, AbilityEffect, AbilityTrigger, BattleEvent, BattleState, CardDef, DamageScale, Effect } from '../../types';
import { applyEffect, describeEffect, makeCtx } from '../battle/effects';
import { abilityTriggered, addLog, foesOf, isEnemy, nameOf, type Unit, unitIdOf } from '../battle/units';
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
  // 区切りF: ジョブの力にも also（2つ目の力。重装衛士《不落》）
  const jobAlso: AbilityDef[] = (def.battleAbility.also ?? []).map((effect) => ({ name: def.battleAbility.name, effect, source: own.source }));
  return [own, ...jobAlso, ...(u.abilities ?? []).map(a => a.source ? a : { ...a, source: a.pet && u.pet ? { kind: 'pet' as const, id: u.pet.petId, label: u.pet.name } : { kind: 'other' as const } })];
}

const isTriggered = (e: AbilityEffect): e is Extract<AbilityEffect, { when: AbilityTrigger }> => 'when' in e;

// ---------- 常時型 ----------

export interface DamageMods {
  multiplier: number;
  /** 働いた倍率の能力の名前 */
  active: AbilityNotice[];
  ignoreBlock: boolean;
  ignoreBlockNotice?: AbilityNotice;
  /** 1回の攻撃ごとに足すダメージ（倍率を掛ける前。盾打ち・疾走） */
  add: number;
  /** そのカード・効果の最初の1回の攻撃にだけ足すダメージ（弾込め） */
  addOnce: number;
}

/**
 * source が victim に与えるダメージの倍率（敵のレベル × 常時型の能力）とブロック無視。
 * cardAbilities = 使っているカードの特殊能力（そのカードだけで働く）。予測表示でも同じ関数を使う
 */
export function damageModifiers(state: BattleState | undefined, source: Unit, card: CardDef | undefined, victim: Unit | undefined, cardAbilities?: AbilityDef[], perfect?: boolean, element?: string, via?: 'pet' | 'summon'): DamageMods {
  const out: DamageMods = { multiplier: isEnemy(source) ? source.attackMul : 1 + (source.damageBonus ?? 0), active: [], ignoreBlock: false, add: 0, addOnce: 0 };
  const c: CondCtx = { state, self: source, card, target: victim, perfect, via };
  // 弱点のダメージを増やす能力は、まとめて上限を掛ける（弱点 ×1.5 と合わせて BALANCE.elementWeakMax まで）
  let weak = 1;
  for (const ab of cardAbilities?.length ? [...abilitiesOf(source), ...cardAbilities] : abilitiesOf(source)) {
    const e = ab.effect;
    if (!('modifier' in e)) continue;
    if (e.modifier === 'weaknessDamage') {
      const el = element ?? (card?.category === 'physical' && !isEnemy(source) ? source.weaponElement : undefined);
      if (el && victim && isEnemy(victim) && getEnemy(victim.defId).weak?.includes(el) && !getEnemy(victim.defId).resist?.includes(el) && testConditions(e.if, c)) {
        weak *= e.multiplier;
        out.active.push({ name: ab.name, source: ab.source ?? { kind: 'card', id: card?.id, label: card?.name } });
      }
      continue;
    }
    if (e.modifier !== 'damageDealt' && e.modifier !== 'ignoreBlock') continue;
    if (!testConditions(e.if, c)) continue;
    if (e.modifier === 'damageDealt') {
      const m = e.multiplier * scaleOf(e.scale, source, victim);
      const add = (e.add ?? 0) + (e.addFromCounter ? ((source as { counters?: Record<string, number> }).counters?.[e.addFromCounter] ?? 0) : 0) + (e.addFromBlock ? Math.min(e.addFromBlock.max, Math.floor((source.block * e.addFromBlock.pct) / 100)) : 0);
      if (m === 1 && !add) continue;
      out.multiplier *= m;
      if (e.once) out.addOnce += add;
      else out.add += add;
      out.active.push({ name: ab.name, source: ab.source ?? { kind: 'card', id: card?.id, label: card?.name } });
    } else if (e.modifier === 'ignoreBlock') {
      out.ignoreBlock = true;
      out.ignoreBlockNotice ??= { name: ab.name, source: ab.source ?? { kind: 'card', id: card?.id, label: card?.name } };
    }
  }
  out.multiplier *= Math.min(weak, BALANCE.elementWeakMax / BALANCE.elementWeakMul);
  // 区切りD: 英雄たちの交響曲 — 次の攻撃カードのダメージ倍率
  const nextPct = isEnemy(source) ? 0 : (source.counters?.nextAtkPct ?? 0);
  if (nextPct > 0 && card && card.tiers.some((t) => t.effects.some((x) => x.kind === 'damage'))) {
    out.multiplier *= 1 + nextPct / 100;
    out.active.push({ name: '英雄たちの交響曲', source: { kind: 'card', label: '英雄たちの交響曲' } });
  }
  // 区切りD: 血の代価 — 次の攻撃カードの最初の1回に足す
  const blood = isEnemy(source) ? 0 : (source.counters?.bloodAdd ?? 0);
  if (blood > 0 && card && card.tiers.some((t) => t.effects.some((x) => x.kind === 'damage'))) {
    out.addOnce += blood;
    out.active.push({ name: '血の代価', source: { kind: 'card', label: '血の代価' } });
  }
  // 段階7a: 狂王の血鎧 — HPが減るたびにためた分を、次の攻撃カード1枚の倍率に（使ったら playCard で0に戻す）
  const rage = isEnemy(source) ? 0 : (source.counters?.rageAtkPct ?? 0);
  if (rage > 0 && card && card.tiers.some((t) => t.effects.some((x) => x.kind === 'damage'))) {
    out.multiplier *= 1 + rage / 100;
    const ab = rageStackOf(source)?.ability;
    out.active.push({ name: ab?.name ?? '狂王の怒り', source: ab?.source ?? { kind: 'equipment' } });
  }
  return out;
}

/** 常時型の能力のうち、ある種類の最初の物（段階7a の専用の装備で使う） */
function firstModifier<K extends string>(u: Unit, kind: K): { effect: Extract<AbilityEffect, { modifier: K }>; ability: AbilityDef } | undefined {
  if (isEnemy(u)) return undefined;
  for (const ab of abilitiesOf(u)) if ('modifier' in ab.effect && ab.effect.modifier === kind) return { effect: ab.effect as Extract<AbilityEffect, { modifier: K }>, ability: ab };
  return undefined;
}
/** 「×N回」の攻撃の回数の上乗せ（連装ガトリング銃。合計） */
export const extraHitsOf = (u: Unit) => (isEnemy(u) ? 0 : abilitiesOf(u).reduce((n, ab) => n + ('modifier' in ab.effect && ab.effect.modifier === 'extraHits' ? ab.effect.add : 0), 0));
/** お供の自動の行動が2回になる能力（双子の魂の鈴） */
export const petTwiceOf = (u: Unit) => firstModifier(u, 'petTwice')?.ability;
/** 成功0を完全成功に変える能力（いかさま師の黄金賽） */
export const rigDiceOf = (u: Unit) => firstModifier(u, 'rigDice')?.ability;
/** 持ち越せるマナの上限（過充填の魔導炉。一番大きい物。無ければ0） */
export const carryManaOf = (u: Unit) => (isEnemy(u) ? 0 : abilitiesOf(u).reduce((n, ab) => Math.max(n, 'modifier' in ab.effect && ab.effect.modifier === 'carryMana' ? ab.effect.max : 0), 0));
/** 得たブロックを仲間に分ける能力（共鳴する絆の指輪） */
export const shareBlockOf = (u: Unit) => firstModifier(u, 'shareBlock');
/** HPが減るたびに次の攻撃をためる能力（狂王の血鎧） */
export const rageStackOf = (u: Unit) => firstModifier(u, 'rageStack');

/** HPが1より下がらない（命綱。区切りD） */
export const enduresOf = (u: Unit) => !isEnemy(u) && abilitiesOf(u).some((ab) => 'modifier' in ab.effect && ab.effect.modifier === 'endure');

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
  // 区切りD: 群れの狩り — 自分のお供・召喚（砲台・罠・幻獣・群れの獣・屍兵・分身）の数
  else if (sc.by === 'companions') v = isEnemy(self) ? 0 : (self.pet ? 1 : 0) + (self.summons?.length ?? 0);
  const add = sc.per * v;
  return 1 + (sc.max !== undefined ? Math.min(sc.max, add) : add);
}

/** カードの成功率の上乗せ（狙い撃ちなど。常時型 cardChance の合計） */
export function cardChanceBonus(u: Unit, card: CardDef, target?: Unit, state?: BattleState): number {
  let n = 0;
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'cardChance' && testConditions(e.if, { state, self: u, card, target })) n += e.bonus;
  }
  return n;
}

/**
 * 残りの枠も全部成功になる能力（completeSlots）が、今のカードに効くか。
 * keys = 効いた「1ターンに1枚だけ」の能力の数えの名前（カードを使った時に markCostUsed で数える）。ここでは何も書き換えない・乱数も使わない
 */
export function completeSlotsOf(state: BattleState | undefined, u: Unit, card: CardDef, focusUsed: number, target?: Unit): { active: boolean; keys: string[]; notices: AbilityNotice[] } {
  const keys: string[] = [];
  const notices: AbilityNotice[] = [];
  let active = false;
  const counters = (u as { counters?: Record<string, number> }).counters ?? {};
  // カード自身の能力も見る（奥義・月下断）
  for (const ab of [...abilitiesOf(u), ...(cardTraitAbilities(card) ?? []).map((a) => ({ ...a, source: { kind: 'card' as const, label: card.name } }))]) {
    const e = ab.effect;
    if (!('modifier' in e) || e.modifier !== 'completeSlots') continue;
    if (e.turnKey && counters[`once:${e.turnKey}`] === (state?.turn ?? 0)) continue;
    if (!testConditions(e.if, { state, self: u, card, target, focusUsed })) continue;
    active = true;
    if (e.turnKey) {
      keys.push(e.turnKey);
      notices.push({ name: ab.name, source: ab.source });
    }
  }
  return { active, keys, notices };
}

/**
 * カードのコスト（常時型 cardCost を全部当てた後。0より下にはならない）。
 * keys = 効いた「1ターンに1枚だけ」の能力の数えの名前（カードを使った時に markCostUsed で数える）。ここでは何も書き換えない
 */
/** uid = 手札のそのカード（詠唱の栞の「引いたそのカードのコスト-1」に使う） */
export function cardCostOf(state: BattleState | undefined, u: Unit, card: CardDef, uid?: string): { cost: number; keys: string[]; active: AbilityNotice[] } {
  let cost = card.cost;
  const keys: string[] = [], active: AbilityNotice[] = [];
  if (isEnemy(u)) return { cost, keys, active };
  const counters = (u as { counters?: Record<string, number> }).counters ?? {};
  // カード自身の能力も見る（竜牙: 1ターン目はコスト1）
  for (const ab of [...abilitiesOf(u), ...(cardTraitAbilities(card) ?? []).map((a) => ({ ...a, source: { kind: 'card' as const, label: card.name } }))]) {
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
  // 詠唱の栞: 引いたそのカードだけ、このターンだけ
  const cheap = (u as { cheapCard?: { uid: string; turn: number; delta: number } }).cheapCard;
  if (uid && cheap && cheap.uid === uid && cheap.turn === (state?.turn ?? 0)) {
    const next = Math.max(0, cost + cheap.delta);
    if (next !== cost) { cost = next; active.push({ name: '詠唱の栞', source: { kind: 'card', label: '詠唱の栞' } }); }
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
/** viaElement = 属性ダメージに付いてくる状態異常の時（element: true の能力だけが乗る） */
export function statusBonusOf(u: Unit, status: string, card?: CardDef, target?: Unit, state?: BattleState, viaElement?: boolean): number {
  let n = 0;
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'statusBonus' && (!viaElement || e.element) && e.statuses.includes(status) && testConditions(e.if, { state, self: u, card, target })) n += e.amount;
  }
  return n;
}

/** ターンの始めに残るブロックの上限（不動の錨。持っていなければ0。複数あれば一番大きい物） */
export function keepBlockOf(u: Unit): number {
  let n = 0;
  let fortify = false;
  for (const ab of abilitiesOf(u)) if ('modifier' in ab.effect && ab.effect.modifier === 'keepBlock') { n = Math.max(n, ab.effect.pct !== undefined ? Math.min(ab.effect.max, Math.floor((u.block * ab.effect.pct) / 100)) : ab.effect.max); if (ab.effect.fortify) fortify = true; }
  // 何を重ねても、残せるのは25まで（不落の城塞を使ったターンだけ50。区切りD）
  return Math.min(n, fortify ? BALANCE.keepBlockFortify : BALANCE.keepBlockCap);
}

/** カードの特殊能力を、also まで広げた一覧（区切りD: 1枚のカードに2つの力を持たせる） */
export function cardTraitAbilities(card: CardDef | undefined): AbilityDef[] | undefined {
  if (!card?.trait) return undefined;
  const t = card.trait;
  return [t, ...(t.also ?? []).map((effect) => ({ name: t.name, effect }))];
}

/** 使っているカードの、ある種類の常時型の能力（区切りD: 連携の倍率・BREAK の数え） */
export function cardModifier<K extends string>(abilities: AbilityDef[] | undefined, kind: K): Extract<AbilityEffect, { modifier: K }>[] {
  return (abilities ?? []).map((a) => a.effect).filter((e): e is Extract<AbilityEffect, { modifier: K }> => 'modifier' in e && e.modifier === kind);
}

/** 砲台・罠・召喚が2回ずつ発動する能力（永久機関）。持っていればその能力 */
export function summonTwiceOf(u: Unit): AbilityDef | undefined {
  return abilitiesOf(u).find((ab) => 'modifier' in ab.effect && ab.effect.modifier === 'summonTwice');
}

/** 砲台・罠・召喚の残りターンの上乗せ（歯車の目。合計） */
export function summonTurnsBonus(u: Unit): number {
  let n = 0;
  for (const ab of abilitiesOf(u)) if ('modifier' in ab.effect && ab.effect.modifier === 'summonTurns') n += ab.effect.add;
  return n;
}

/**
 * 敵から悪い状態異常を受けるはずの時に、防ぐ能力（statusGuard）があれば防ぐ。防いだら true（状態異常は付けない）。
 * 自分の能力を先に見て、次に生きている仲間の「味方全員を守る」能力を見る。
 * 回数は「守られる人」の counters に数える（乱数は使わない。保存して再開しても・オンラインでも同じ結果）
 */
export function guardStatus(state: BattleState, events: BattleEvent[], victim: Unit, status: string): boolean {
  if (isEnemy(victim) || victim.dead || !getStatus(status).harmful) return false;
  const counters = ((victim as { counters?: Record<string, number> }).counters ??= {});
  for (const holder of [victim, ...state.allies.filter((u) => u !== victim && !u.dead)]) {
    for (const ab of abilitiesOf(holder)) {
      const e = ab.effect;
      if (!('modifier' in e) || e.modifier !== 'statusGuard') continue;
      if (holder !== victim && !e.allies) continue;
      if (e.statuses && !e.statuses.includes(status)) continue;
      const k = `battle:statusGuard:${unitIdOf(holder)}:${ab.name}`;
      if (e.perBattle !== undefined) {
        if ((counters[k] ?? 0) >= e.perBattle) continue;
        counters[k] = (counters[k] ?? 0) + 1;
      }
      if (e.block) {
        victim.block += e.block;
        events.push({ type: 'block', unitId: unitIdOf(victim), amount: e.block });
      }
      abilityTriggered(state, unitIdOf(holder), ab.name, events, ab.source);
      addLog(state, `${nameOf(holder)}の「${ab.name}」！ ${nameOf(victim)}は「${getStatus(status).name}」を防いだ${e.block ? `（ブロック${e.block}）` : ''}`);
      return true;
    }
  }
  return false;
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
  opts: { card?: CardDef; /** 条件を見る時だけ使うカード（敵を倒した時。効果はカード無しで動かす） */ condCard?: CardDef; multi?: { total: number; landed: number }; target?: Unit; allyTarget?: Unit; attacker?: Unit; dealt?: number; list?: AbilityDef[]; depth?: number; focusUsed?: number; statusId?: string; tierEffects?: Effect[]; perfect?: boolean; successes?: number; supportedOthers?: boolean; supportedSelf?: boolean; helped?: Unit[]; weakTarget?: Unit; wasFull?: boolean } = {},
): string[] {
  const out: string[] = [];
  if (owner.dead && when !== 'hurt' && !(when === 'allyDown' && opts.target === owner)) return out;
  for (const ab of opts.list ?? abilitiesOf(owner)) {
    const e = ab.effect;
    if (!isTriggered(e) || e.when !== when) continue;
    // お供の行動は、全部合わせて1ターンに4回まで
    if (ab.pet && petCapped(owner)) continue;
    if (!testConditions(e.if, { state, rng, self: owner, card: opts.card ?? opts.condCard, multi: opts.multi, target: opts.target, dealt: opts.dealt, focusUsed: opts.focusUsed, perfect: opts.perfect, successes: opts.successes, supportedOthers: opts.supportedOthers, supportedSelf: opts.supportedSelf, weakHit: !!opts.weakTarget, wasFull: opts.wasFull, statusId: opts.statusId })) continue;
    // 段階7a: 双子の魂の鈴 — お供の自動の行動は2回（2回目は条件を見ずに同じ行動をもう1回。お供の行動の上限 PET_ACTS_PER_TURN の中で）
    const twin = ab.pet ? petTwiceOf(owner) : undefined;
    for (let k = 0; k < (twin ? 2 : 1); k++) {
      if (k > 0 && (owner.dead || petCapped(owner))) break;
      const ctx = makeCtx(state, rng, events, owner, { target: opts.target, allyTarget: opts.allyTarget, attacker: opts.attacker, card: opts.card, dealt: opts.dealt, statusId: opts.statusId, depth: opts.depth, tierEffects: opts.tierEffects, perfect: opts.perfect, cardAbilities: cardTraitAbilities(opts.card), via: ab.pet ? 'pet' : undefined, weakTarget: opts.weakTarget, helped: opts.helped });
      let any = false;
      for (const eff of e.do) any = applyEffect(ctx, eff) || any;
      if (!any) break;
      // 2回目は別の名前で知らせる（同じ名前だと画面で1つのカットインにまとまり、お供が1回しか跳ねないため）
      abilityTriggered(state, unitIdOf(owner), k > 0 ? `${ab.name}・もう1回` : ab.name, events, ab.source ?? (opts.list ? { kind: 'card', id: opts.card?.id, label: opts.card?.name } : undefined));
      for (const n of ctx.fired) abilityTriggered(state, unitIdOf(owner), n.name, events, n.source);
      if (k > 0 && twin) abilityTriggered(state, unitIdOf(owner), twin.name, events, twin.source);
      if (ab.pet) afterPetAct(state, rng, events, owner, opts.depth ?? 0);
      const res = ctx.parts.join(' ');
      out.push(res ? `${ab.name}（${res}）` : ab.name);
      addLog(state, `${nameOf(owner)}の「${ab.name}」！${k > 0 ? '（もう1回）' : ''} ${res}`);
    }
  }
  return out;
}

/** お供の行動の上限（1ターンに、全部合わせてこの回数まで。数えは味方のフェーズの始めに0へ戻す） */
export const PET_ACTS_PER_TURN = 4;
const petCapped = (owner: Unit) => ((owner as { counters?: Record<string, number> }).counters?.petActsTurn ?? 0) >= PET_ACTS_PER_TURN;

/** お供が行動した後: 活躍の回数（戦績に出す）を数え、きっかけ「お供が行動した時」（相棒の鈴など）を起こす */
function afterPetAct(state: BattleState, rng: Rng, events: BattleEvent[], owner: Unit, depth: number) {
  const c = ((owner as { counters?: Record<string, number> }).counters ??= {});
  c.petActs = (c.petActs ?? 0) + 1;
  c.petActsTurn = (c.petActsTurn ?? 0) + 1;
  if (depth < 3) fireAbilities(state, rng, events, owner, 'petAct', { depth: depth + 1 });
}

/**
 * お供が1回行動する（夢つかみ）。お供の発動型の能力を1つだけ、きっかけと条件を見ずに発動する。
 * 戦闘開始時ではない能力を先に選ぶ（無ければ戦闘開始時の能力をもう1回）。対象が要る効果は、先頭の生きている敵へ。
 * 何も起きなかった時（例: まだカードを使っていないターンの子狼）は undefined
 */
export function petActOnce(state: BattleState, rng: Rng, events: BattleEvent[], owner: Unit, depth = 0): string | undefined {
  if (owner.dead || isEnemy(owner) || petCapped(owner)) return undefined;
  const list = abilitiesOf(owner).filter((ab) => ab.pet && isTriggered(ab.effect));
  const ab = list.find((a) => isTriggered(a.effect) && a.effect.when !== 'battleStart') ?? list[0];
  if (!ab || !isTriggered(ab.effect)) return undefined;
  const ctx = makeCtx(state, rng, events, owner, { target: foesOf(state, owner)[0], depth, via: 'pet' });
  let any = false;
  for (const eff of ab.effect.do) any = applyEffect(ctx, eff) || any;
  if (!any) return undefined;
  abilityTriggered(state, unitIdOf(owner), ab.name, events, ab.source);
  for (const n of ctx.fired) abilityTriggered(state, unitIdOf(owner), n.name, events, n.source);
  afterPetAct(state, rng, events, owner, depth);
  const res = ctx.parts.join(' ');
  addLog(state, `${nameOf(owner)}の「${ab.name}」！ ${res}`);
  return res ? `${ab.name}（${res}）` : ab.name;
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
  petAct: 'お供が行動した時',
  summonHit: '自分の砲台・罠・召喚が敵にダメージを与えた後',
  overheal: '回復がHPからあふれた時',
  cheerPerfect: '自分が応援を付けた味方のカードが完全成功した時',
  detonate: '状態異常を起爆して消した時',
  combo: 'このカードで連携が起きた時',
  guarded: '敵の攻撃をブロックで防いだ時',
  selfBoost: 'カードで自分が回復かブロックを得た時',
  allyCombo: '味方（自分も）のカードで連携が起きた時',
  broke: '自分の攻撃で敵を BREAK させた時',
  itemUse: '戦闘中に自分が消耗品を使った時',
  goldGain: '戦闘中に自分がお金を得た時',
  statusTaken: '自分に悪い状態異常が付いた時',
  turnStartBefore: 'ターン開始時',
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
    if (e.modifier === 'summonTurns') return `自分の砲台・罠・召喚の残りターン+${e.add}`;
    if (e.modifier === 'statusGuard') {
      const what = e.statuses ? e.statuses.map((x) => `「${getStatus(x).name}」`).join('') : '悪い状態異常';
      const tail = e.block ? `。防いだ時、ブロック${e.block}` : '';
      if (e.perBattle !== undefined) return `1回の戦闘で${e.perBattle}回、${e.allies ? '味方全員が、それぞれ' : ''}敵から受ける${what}を防ぐ${tail}`;
      return `${e.allies ? '味方全員が、' : ''}敵から${what}を受けない${tail}`;
    }
    if (e.modifier === 'comboScale') return `このカードの連携の上乗せ×${e.multiplier}（連携は合わせて+${Math.round(BALANCE.comboBonusMax * 100)}%まで）`;
    if (e.modifier === 'endure') return 'HPが1より下がらない';
    if (e.modifier === 'counterCap') return [e.add ? `《後の先》の1回の反撃の上限+${e.add}` : '', e.times ? `《後の先》の反撃の回数の上限+${e.times}` : ''].filter(Boolean).join('・');
    if (e.modifier === 'mirrorCounter') return '《後の先》の反撃が2倍・上限なし';
    if (e.modifier === 'alwaysWeak') return '弱点の属性でなくても、弱点を突いた扱い（ダメージ×1.5・BREAK のきっかけ）';
    if (e.modifier === 'weaknessElement') return '属性は、狙った敵の弱点の属性に変わる（弱点が無い敵には無属性）';
    if (e.modifier === 'breakOnSuccess') return `大技を予告している敵は、成功${e.min}以上でも BREAK できる`;
    if (e.modifier === 'noPlayCount') return 'このカードは「このターンに使ったカード」に数えない（《居合》をためながら使える）';
    if (e.modifier === 'extraHits') return `「×N回」の攻撃の回数+${e.add}`;
    if (e.modifier === 'petTwice') return 'お供の自動の行動が2回になる（カードで動かした時は1回。お供の行動は1ターンに4回まで）';
    if (e.modifier === 'rigDice') return 'カードの成功が0だったら、完全成功に変わり、フォーカス+1（1ターンに1回）';
    if (e.modifier === 'carryMana') return `使わずに残ったマナを、次のターンに最大${e.max}持ち越す`;
    if (e.modifier === 'shareBlock') return `カードで自分が得たブロックの${e.pct}%を、HPの割合が一番低いほかの味方にも`;
    if (e.modifier === 'rageStack') return `HPが減るたび、次の攻撃カード1枚のダメージ+${e.pct}%（最大+${e.max}%。使うと0に戻る）`;
    const cs = condText(e.if);
    const head = cs.length ? `${cs.join('・')}：` : '';
    if (e.modifier === 'breakCount') return `${head}BREAK の数え（このターンの合計ダメージ）が${e.multiplier}倍`;
    if (e.modifier === 'cardChance') return `${head}成功率+${e.bonus}%`;
    if (e.modifier === 'completeSlots') return `${head}残りの枠も全て成功する`;
    if (e.modifier === 'exhaust') return '1戦闘1回。使ったカードは戦闘が終わるまで山札から除く';
    if (e.modifier === 'slotPreview') return `1戦闘${e.uses}回、次のカードのスロットを先読みし、1回だけ振り直せる`;
    if (e.modifier === 'cardCost') return `${head}カードのコスト${e.set !== undefined ? `が${e.set}になる` : `${(e.delta ?? 0) > 0 ? '+' : ''}${e.delta ?? 0}`}${e.turnKey ? '（1ターンに1枚）' : ''}`;
    if (e.modifier === 'chestChance') return `宝箱の運の判定+${e.bonus}%`;
    if (e.modifier === 'elementGuard') return `${head}${getElement(e.element).name}属性のダメージを${e.mode === 'immune' ? '無効にする' : e.mode === 'absorb' ? '受けず、その分回復する' : '半分にする'}`;
    if (e.modifier === 'convertElement') return `${head}属性の無い物理攻撃が${getElement(e.into).name}属性になる`;
    if (e.modifier === 'weaknessDamage') return `${head}弱点属性のダメージ×${Math.round(e.multiplier * 100) / 100}（弱点の倍率は合わせて×${BALANCE.elementWeakMax}まで）`;
    if (e.modifier === 'statusBonus') return `${head}自分が付ける${e.statuses.map((x) => `「${getStatus(x).name}」`).join('')}+${e.amount}`;
    if (e.modifier === 'damageDealt' && e.addFromCounter) return `${head}最初の1回の攻撃のダメージ+（ためた量）`;
    if (e.modifier === 'damageDealt' && e.addFromBlock) return `${head}${e.once ? '最初の1回の攻撃の' : ''}ダメージ+今のブロックの${e.addFromBlock.pct}%（最大+${e.addFromBlock.max}）`;
    if (e.modifier === 'damageDealt') return `${head}${e.add ? `${e.once ? '最初の1回の攻撃の' : '1回の攻撃ごとに'}ダメージ+${e.add}${e.multiplier !== 1 || e.scale ? '、' : ''}` : ''}${e.multiplier !== 1 ? `与えるダメージ×${e.multiplier}${e.scale ? '、さらに' : ''}` : ''}${e.scale ? scaleText(e.scale) : ''}`;
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
  if (sc.by === 'companions') return `自分のお供・召喚1体につき与えるダメージ+${pct}%${cap}`;
  if (sc.by === 'gold') return `所持金${sc.step ?? 1}Gごとに与えるダメージ+${pct}%${cap}`;
  return `自分の「${sc.status ? getStatus(sc.status).name : ''}」1つにつき与えるダメージ+${pct}%${cap}`;
}
