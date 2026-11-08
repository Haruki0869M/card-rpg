// ===== 状態異常の処理（種類ごとの動きは src/content の statuses のデータで決まる） =====
import { getStatus, STATUSES } from '../../data/statuses';
import type { StatusDef, Statuses } from '../../types';

/** すべての状態異常が0の表 */
export const emptyStatuses = (): Statuses => Object.fromEntries(STATUSES.all.map((s) => [s.id, 0]));

/** 数を読む（無い・登録外は0） */
export const stacks = (s: Statuses | undefined, id: string): number => s?.[id] ?? 0;

/** 状態異常を付ける（未登録のIDはエラー） */
export function addStatus(s: Statuses, id: string, amount: number) {
  const def = getStatus(id);
  const next = stacks(s, id) + amount;
  s[id] = def.maxStacks !== undefined ? Math.min(def.maxStacks, next) : next;
}

/** 付いている状態異常（登録順） */
export const activeStatuses = (s: Statuses | undefined): { def: StatusDef; amount: number }[] =>
  STATUSES.all.filter((d) => stacks(s, d.id) > 0).map((def) => ({ def, amount: stacks(s, def.id) }));

/** 悪い状態異常が付いているか */
export const hasHarmful = (s: Statuses | undefined) => STATUSES.all.some((d) => d.harmful && stacks(s, d.id) > 0);

/** 悪い状態異常をすべて消す */
export function cleanse(s: Statuses) {
  for (const d of STATUSES.all) if (d.harmful) s[d.id] = 0;
}

/** 与えるダメージ・受けるダメージの倍率（付いている状態異常の積） */
export function dealtMultiplier(s: Statuses | undefined): number {
  let m = 1;
  for (const { def } of activeStatuses(s)) if (def.dealtMultiplier !== undefined) m *= def.dealtMultiplier;
  return m;
}
export function takenMultiplier(s: Statuses | undefined): number {
  let m = 1;
  for (const { def } of activeStatuses(s)) if (def.takenMultiplier !== undefined) m *= def.takenMultiplier;
  return m;
}

const tickOf = (def: StatusDef, amount: number) => (def.tickDamage === 'stacks' ? amount : (def.tickDamage ?? 0));

/** フェーズの終わりに受ける継続ダメージの合計（予測用。数は変えない） */
export function tickDamageOf(s: Statuses | undefined): number {
  let n = 0;
  for (const { def, amount } of activeStatuses(s)) n += tickOf(def, amount);
  return n;
}

/**
 * フェーズの終わりの継続ダメージ（毒・火傷など）。ダメージの合計を返し、継続ダメージを持つ状態異常を減らす。
 * 名前の一覧はログ用
 */
export function applyTick(s: Statuses): { damage: number; names: string[] } {
  let damage = 0;
  const names: string[] = [];
  for (const { def, amount } of activeStatuses(s)) {
    if (def.tickDamage === undefined) continue;
    damage += tickOf(def, amount);
    names.push(def.name);
    s[def.id] = Math.max(0, amount - (def.decay ?? 1));
  }
  return { damage, names };
}

/** フェーズの終わりに、継続ダメージを持たない状態異常を減らす（脆弱・弱体など） */
export function decayStatuses(s: Statuses) {
  for (const { def, amount } of activeStatuses(s)) {
    if (def.tickDamage !== undefined) continue;
    s[def.id] = Math.max(0, amount - (def.decay ?? 1));
  }
}

const pct = (m: number) => `×${m}`;

/** 説明文（データに description が無ければ数値から作る） */
export function describeStatus(def: StatusDef): string {
  if (def.description) return def.description;
  const parts: string[] = [];
  if (def.takenMultiplier !== undefined) parts.push(`受けるダメージ${pct(def.takenMultiplier)}（端数切り捨て）`);
  if (def.dealtMultiplier !== undefined) parts.push(`与えるダメージ${pct(def.dealtMultiplier)}（端数切り捨て）`);
  if (def.tickDamage !== undefined)
    parts.push(`フェーズ終了時に${def.tickDamage === 'stacks' ? '数値分の' : `${def.tickDamage}`}ダメージ（ブロック無視）`);
  if (def.tickHeal !== undefined) parts.push(`フェーズの始めに${def.tickHeal === 'stacks' ? '数値分' : def.tickHeal}HP回復`);
  if (def.healMultiplier !== undefined) parts.push(`受ける回復量${pct(def.healMultiplier)}`);
  if (def.chancePenalty) parts.push(`味方はカードの成功率-${def.chancePenalty}%`);
  if (def.actionFailChance) parts.push(`敵は${def.actionFailChance}%の確率で行動に失敗する`);
  if (def.skipAction) parts.push('敵は次の行動を1回休む');
  if (def.manaPenalty) parts.push(`味方は次のターンのマナ-${def.manaPenalty}`);
  if (def.drawPenalty) parts.push(`味方は次のターンに引くカード-${def.drawPenalty}枚（1つにつき）`);
  if (def.skipAction || def.manaPenalty) parts.push('効いたら消える');
  const decay = def.decay ?? 1;
  if (!(def.skipAction || def.manaPenalty)) parts.push(decay > 0 ? `フェーズ終了時に${decay}減る` : '戦闘中は減らない');
  if (!def.harmful) parts.push('良い効果（万能薬では消えない）');
  return parts.join('。');
}

// ---------- 痺れ・凍結・呪い・再生など（データの項目ごとの効き方） ----------

/** 受ける回復量の倍率 */
export function healMultiplier(s: Statuses | undefined): number {
  let m = 1;
  for (const { def } of activeStatuses(s)) if (def.healMultiplier !== undefined) m *= def.healMultiplier;
  return m;
}

/** 味方のカードの成功率の低下（%） */
export function chancePenaltyOf(s: Statuses | undefined): number {
  let n = 0;
  for (const { def } of activeStatuses(s)) n += def.chancePenalty ?? 0;
  return n;
}

/** 敵の行動が失敗する確率（%。複数あれば一番高いもの） */
export function actionFailChanceOf(s: Statuses | undefined): number {
  let n = 0;
  for (const { def } of activeStatuses(s)) n = Math.max(n, def.actionFailChance ?? 0);
  return n;
}

/** 次の行動を休む状態異常（凍結など）。付いていればその定義 */
export const skipActionStatus = (s: Statuses | undefined) => activeStatuses(s).find(({ def }) => def.skipAction)?.def;

/** 1つ減らす（凍結が効いた時など） */
export function consumeStatus(s: Statuses, id: string) {
  s[id] = Math.max(0, stacks(s, id) - 1);
}

/** 次のフェーズで減るマナと、その状態異常（使った分は1減らす） */
export function takeManaPenalty(s: Statuses): { amount: number; names: string[] } {
  let amount = 0;
  const names: string[] = [];
  for (const { def } of activeStatuses(s)) {
    if (!def.manaPenalty) continue;
    amount += def.manaPenalty;
    names.push(def.name);
    consumeStatus(s, def.id);
  }
  return { amount, names };
}

/** 次のターンの初めに減る引く枚数と、その状態異常（遅延など。使ったら全部消す） */
export function takeDrawPenalty(s: Statuses): { amount: number; names: string[] } {
  let amount = 0;
  const names: string[] = [];
  for (const { def, amount: n } of activeStatuses(s)) {
    if (!def.drawPenalty) continue;
    amount += def.drawPenalty * n;
    names.push(def.name);
    s[def.id] = 0;
  }
  return { amount, names };
}

/** フェーズの始めに回復する量（再生など） */
export function tickHealOf(s: Statuses | undefined): { amount: number; names: string[] } {
  let amount = 0;
  const names: string[] = [];
  for (const { def, amount: n } of activeStatuses(s)) {
    if (def.tickHeal === undefined) continue;
    amount += def.tickHeal === 'stacks' ? n : def.tickHeal;
    names.push(def.name);
  }
  return { amount, names };
}
