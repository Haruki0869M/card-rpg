// 消費アイテム
import type { ItemDef } from '../../../types';

export const consumables: ItemDef[] = [
  { id: 'potion', name: '回復薬', slot: 'consumable', rarity: 'common', icon: 'potion', description: '薬草を煎じた定番の薬。', use: [{ kind: 'heal', amount: 20 }] },
  { id: 'hiPotion', name: '上回復薬', slot: 'consumable', rarity: 'rare', icon: 'potion', description: '高価な薬草を惜しみなく使った薬。', use: [{ kind: 'heal', amount: 45 }] },
  { id: 'ether', name: '気付け薬', slot: 'consumable', rarity: 'common', icon: 'ether', description: '鼻にツンとくる香りで目が覚める。', use: [{ kind: 'gainFocus', amount: 2, to: 'target' }] },
  { id: 'antidote', name: '万能薬', slot: 'consumable', rarity: 'common', icon: 'antidote', description: 'どんな不調にも効くという万能の薬。', use: [{ kind: 'cleanse' }] },
  { id: 'smokeBomb', name: '煙玉', slot: 'consumable', rarity: 'rare', icon: 'smoke', description: '辺りを煙で包み、その隙に逃げる。', use: [{ kind: 'escape' }] },
  { id: 'holyWater', name: '聖水', slot: 'consumable', rarity: 'common', icon: 'antidote', description: '清らかな泉の水。亡者を鎮める力がある。', use: [{ kind: 'cleanse' }] },
];
