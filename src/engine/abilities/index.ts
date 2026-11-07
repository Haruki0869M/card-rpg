// ===== 特殊能力（職業・装備・カード・敵で共通。spec §2.4・§6.2・§12.7・§13.1） =====
// 能力はデータ（きっかけ＋条件＋効果 / 常時型）で書く。ここは共通の処理だけ。
//  - 新しい条件: conditions/ にファイルを1つ置く
//  - 新しい効果: src/engine/battle/effects/kinds/ にファイルを1つ置く
//  - 職業IDや能力名による分岐は書かない
import { getClass } from '../../data/classes';
import { getEnemy } from '../../data/enemies';
import { getStatus } from '../../data/statuses';
import type { AbilityCondition, AbilityDef, AbilityEffect, AbilityTrigger, BattleEvent, BattleState, CardDef, DamageScale } from '../../types';
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
  if (isEnemy(u)) return getEnemy(u.defId).abilities ?? [];
  const own = getClass(u.classId).battleAbility;
  return u.abilities?.length ? [own, ...u.abilities] : [own];
}

const isTriggered = (e: AbilityEffect): e is Extract<AbilityEffect, { when: AbilityTrigger }> => 'when' in e;

// ---------- 常時型 ----------

export interface DamageMods {
  multiplier: number;
  /** 働いた倍率の能力の名前 */
  active: string[];
  ignoreBlock: boolean;
  ignoreBlockName?: string;
}

/**
 * source が victim に与えるダメージの倍率（敵のレベル × 常時型の能力）とブロック無視。
 * cardAbilities = 使っているカードの特殊能力（そのカードだけで働く）。予測表示でも同じ関数を使う
 */
export function damageModifiers(state: BattleState | undefined, source: Unit, card: CardDef | undefined, victim: Unit | undefined, cardAbilities?: AbilityDef[], perfect?: boolean): DamageMods {
  const out: DamageMods = { multiplier: isEnemy(source) ? source.attackMul : 1, active: [], ignoreBlock: false };
  const c: CondCtx = { state, self: source, card, target: victim, perfect };
  for (const ab of cardAbilities?.length ? [...abilitiesOf(source), ...cardAbilities] : abilitiesOf(source)) {
    const e = ab.effect;
    if (!('modifier' in e) || (e.modifier !== 'damageDealt' && e.modifier !== 'ignoreBlock')) continue;
    if (!testConditions(e.if, c)) continue;
    if (e.modifier === 'damageDealt') {
      const m = e.multiplier * scaleOf(e.scale, source, victim);
      if (m === 1) continue;
      out.multiplier *= m;
      out.active.push(ab.name);
    } else if (e.modifier === 'ignoreBlock') {
      out.ignoreBlock = true;
      out.ignoreBlockName ??= ab.name;
    }
  }
  return out;
}

/** 倍率の上乗せ（状況で増える分。1 = 上乗せ無し） */
function scaleOf(sc: DamageScale | undefined, self: Unit, target: Unit | undefined): number {
  if (!sc) return 1;
  let v = 0;
  if (sc.by === 'missingHp') v = 1 - Math.max(0, self.hp) / Math.max(1, self.maxHp);
  else if (sc.by === 'targetStatuses') v = target ? Object.entries(target.statuses).filter(([id, n]) => (n ?? 0) > 0 && getStatus(id).harmful).length : 0;
  else if (sc.by === 'selfStatus') v = sc.status ? (self.statuses[sc.status] ?? 0) : 0;
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

/** 自分が付ける状態異常の量の上乗せ（呪詛など） */
export function statusBonusOf(u: Unit, status: string, card?: CardDef): number {
  let n = 0;
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'statusBonus' && e.statuses.includes(status) && testConditions(e.if, { self: u, card })) n += e.amount;
  }
  return n;
}

/** かばう能力の発動確率（複数あれば一番高いもの。持っていなければ null） */
export function coverChance(u: Unit): { chance: number; name: string } | null {
  let best: { chance: number; name: string } | null = null;
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier === 'coverLethal' && (!best || e.chance > best.chance)) best = { chance: e.chance, name: ab.name };
  }
  return best;
}

/** 条件付きで今働いている常時型の能力の名前（表示用。例: HPが半分以下の間の「闘志」） */
export function activePassiveNames(u: Unit): string[] {
  if (u.dead) return [];
  const names: string[] = [];
  for (const ab of abilitiesOf(u)) {
    const e = ab.effect;
    if ('modifier' in e && e.modifier !== 'coverLethal' && e.if?.some((x) => x.kind === 'selfHpAtMost') && testConditions(e.if?.filter((x) => x.kind === 'selfHpAtMost'), { self: u }))
      names.push(ab.name);
  }
  return names;
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
  opts: { card?: CardDef; target?: Unit; dealt?: number; list?: AbilityDef[]; depth?: number } = {},
): string[] {
  const out: string[] = [];
  if (owner.dead && when !== 'hurt') return out;
  for (const ab of opts.list ?? abilitiesOf(owner)) {
    const e = ab.effect;
    if (!isTriggered(e) || e.when !== when) continue;
    if (!testConditions(e.if, { state, rng, self: owner, card: opts.card, target: opts.target, dealt: opts.dealt })) continue;
    const ctx = makeCtx(state, rng, events, owner, { target: opts.target, card: opts.card, dealt: opts.dealt, depth: opts.depth });
    let any = false;
    for (const eff of e.do) any = applyEffect(ctx, eff) || any;
    if (!any) continue;
    abilityTriggered(state, unitIdOf(owner), ab.name, events);
    for (const n of ctx.fired) abilityTriggered(state, unitIdOf(owner), n, events);
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
};

const condText = (conds?: AbilityCondition[]) => (conds ?? []).map((c) => conditionHandler(c.kind).describe(c as never));

/** 特殊能力の説明文。description があればそれを使う。side = 持ち主の側（効果の「敵全員」などの言い方） */
export function describeAbility(ab: AbilityDef, side: 'ally' | 'enemy' = 'ally'): string {
  if (ab.description) return ab.description;
  const e = ab.effect;
  if ('modifier' in e) {
    if (e.modifier === 'coverLethal') return `他の味方がHP0になるダメージを受ける時、${e.chance}%の確率で代わりに受ける（ブロックで防げる）`;
    const cs = condText(e.if);
    const head = cs.length ? `${cs.join('・')}：` : '';
    if (e.modifier === 'cardChance') return `${head}成功率+${e.bonus}%`;
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
  return `自分の「${sc.status ? getStatus(sc.status).name : ''}」1つにつき与えるダメージ+${pct}%${cap}`;
}
