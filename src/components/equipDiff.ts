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
