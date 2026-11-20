// 装飾品
import type { ItemDef } from '../../../types';

export const accessories: ItemDef[] = [
  { id: 'luckyCharm', name: '幸運のお守り', slot: 'accessory', rarity: 'common', icon: 'charm', description: '宝箱を開ける時に頼りになる。', stats: { luk: 10 } },
  { id: 'swiftBoots', name: '疾風の靴', slot: 'accessory', rarity: 'common', icon: 'boots', description: '足取りが軽くなる靴。', stats: { agi: 10 } },
  { id: 'focusRing', name: '集中の指輪', slot: 'accessory', rarity: 'rare', icon: 'ring', description: 'フォーカスの最大値+1。', focusMax: 1 },
  { id: 'foresightAmulet', name: '先読みの首飾り', slot: 'accessory', rarity: 'legend', icon: 'amulet', description: '毎ターン、カードを1枚多く引く。', extraDraw: 1 , ability: { name: '未来視', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'skill' }], do: [{ kind: 'gainFocus', amount: 1 }] } } },
  { id: 'heroCrest', name: '英雄の紋章', slot: 'accessory', rarity: 'legend', icon: 'crest', description: '伝説の英雄の証。', stats: { str: 5, vit: 5, int: 5, per: 5, dex: 5, agi: 5, luk: 5 }, focusMax: 1 , ability: { name: '英雄の魂', effect: { modifier: 'damageDealt', multiplier: 1.15 } } },
];
