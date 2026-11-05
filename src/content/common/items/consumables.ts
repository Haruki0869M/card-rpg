// 消費アイテム
import type { ItemDef } from '../../../types';

export const consumables: ItemDef[] = [
  { id: 'potion', name: '回復薬', slot: 'consumable', rarity: 'common', icon: 'potion', description: '味方1人のHPを20回復。', use: { kind: 'heal', amount: 20 } },
  { id: 'hiPotion', name: '上回復薬', slot: 'consumable', rarity: 'rare', icon: 'potion', description: '味方1人のHPを45回復。', use: { kind: 'heal', amount: 45 } },
  { id: 'ether', name: '気付け薬', slot: 'consumable', rarity: 'common', icon: 'ether', description: '味方1人のフォーカスを2回復。', use: { kind: 'focus', amount: 2 } },
  { id: 'antidote', name: '万能薬', slot: 'consumable', rarity: 'common', icon: 'antidote', description: '味方1人の悪い状態異常をすべて治す。', use: { kind: 'cleanse' } },
  { id: 'smokeBomb', name: '煙玉', slot: 'consumable', rarity: 'rare', icon: 'smoke', description: '戦闘から必ず逃げられる（ボス戦では使えない）。', use: { kind: 'escape' } },
];
