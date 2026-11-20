// ===== 装備を付け替えた時の能力の差（装備の画面と、町で買った時の「すぐ装備」で使う） =====
import { getItem } from '../data/items';
import { STAT_IDS } from '../engine';
import type { EquipSlot, Hero, ItemDef } from '../types';
import { STAT_LABEL } from './ui/game';

/** 装備を変えた時の能力値などの変化 */
export function diffText(hero: Hero, slot: EquipSlot, next: ItemDef | null): { label: string; delta: number }[] {
  const cur = hero.equipment[slot] ? getItem(hero.equipment[slot]!.itemId) : null;
  const out: { label: string; delta: number }[] = [];
  for (const k of STAT_IDS) {
    const d = (next?.stats?.[k] ?? 0) - (cur?.stats?.[k] ?? 0);
    if (d) out.push({ label: STAT_LABEL[k], delta: d });
  }
  const pairs: [string, keyof ItemDef][] = [
    ['最大HP', 'maxHp'],
    ['フォーカス最大', 'focusMax'],
    ['開始時ブロック', 'startBlock'],
    ['ドロー', 'extraDraw'],
  ];
  for (const [label, key] of pairs) {
    const d = ((next?.[key] as number | undefined) ?? 0) - ((cur?.[key] as number | undefined) ?? 0);
    if (d) out.push({ label, delta: d });
  }
  return out;
}

/** 装備の「自分の能力」（差ではなく、その装備そのものの数値）。例: ["器用+10", "最大HP+5"] */
export function itemOwnStats(it: ItemDef): string[] {
  const out: string[] = [];
  for (const k of STAT_IDS) {
    const v = it.stats?.[k];
    if (v) out.push(`${STAT_LABEL[k]}${v > 0 ? '+' : ''}${v}`);
  }
  if (it.maxHp) out.push(`最大HP${it.maxHp > 0 ? '+' : ''}${it.maxHp}`);
  if (it.focusMax) out.push(`フォーカス最大${it.focusMax > 0 ? '+' : ''}${it.focusMax}`);
  if (it.startBlock) out.push(`開始時ブロック${it.startBlock}`);
  if (it.extraDraw) out.push(`毎ターンのドロー+${it.extraDraw}`);
  if (it.explore?.vision) out.push(`世界マップの視界+${it.explore.vision}`);
  if (it.explore?.campHeal) out.push(`野営の回復+${Math.round(it.explore.campHeal * 100)}%`);
  if (it.explore?.petEvent) out.push(`お供を連れている時、イベントの判定+${it.explore.petEvent}%`);
  if (it.explore?.reveal === 'rest') out.push('ダンジョンの地図に、休憩部屋が最初から出る');
  if (it.explore?.reveal === 'layout') out.push('ダンジョンの地図に、通路と扉の場所が最初から出る');
  return out;
}

/** 今の装備と比べた時の違い（数値・特殊能力の入れ替わり・山札のカードの増減） */
export interface ItemCompare {
  /** 比べる相手（今その部位に付けている物。無ければ null） */
  current: ItemDef | null;
  stats: { label: string; delta: number }[];
  /** 特殊能力が変わる時だけ。from/to は能力の名前（無ければ null） */
  ability: { from: string | null; to: string | null } | null;
  /** 山札に加わるカード・抜けるカード（装備で入るカードの差） */
  cardsGained: { cardId: string; count: number }[];
  cardsLost: { cardId: string; count: number }[];
  /** 何も変わらない */
  same: boolean;
}

export function compareItems(hero: Hero, slot: EquipSlot, next: ItemDef | null): ItemCompare {
  const cur = hero.equipment[slot] ? getItem(hero.equipment[slot]!.itemId) : null;
  const stats = diffText(hero, slot, next);
  const from = cur?.ability?.name ?? null;
  const to = next?.ability?.name ?? null;
  const ability = from === to ? null : { from, to };
  const count = (it: ItemDef | null) => {
    const m = new Map<string, number>();
    for (const c of it?.cards ?? []) m.set(c.cardId, (m.get(c.cardId) ?? 0) + c.count);
    return m;
  };
  const a = count(cur), b = count(next);
  const cardsGained: ItemCompare['cardsGained'] = [];
  const cardsLost: ItemCompare['cardsLost'] = [];
  for (const id of new Set([...a.keys(), ...b.keys()])) {
    const d = (b.get(id) ?? 0) - (a.get(id) ?? 0);
    if (d > 0) cardsGained.push({ cardId: id, count: d });
    else if (d < 0) cardsLost.push({ cardId: id, count: -d });
  }
  return { current: cur, stats, ability, cardsGained, cardsLost, same: !stats.length && !ability && !cardsGained.length && !cardsLost.length };
}

/** 差の短い文。例: "器用-10・最大HP+5" */
export function diffLine(stats: { label: string; delta: number }[]): string {
  return stats.map((d) => `${d.label}${d.delta > 0 ? '+' : ''}${d.delta}`).join('・');
}
