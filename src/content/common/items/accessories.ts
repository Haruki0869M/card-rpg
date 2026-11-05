// 装飾品
import type { ItemDef } from '../../../types';

export const accessories: ItemDef[] = [
  { id: 'luckyCharm', name: '幸運のお守り', slot: 'accessory', rarity: 'common', icon: 'charm', description: '宝箱を開ける時に頼りになる。', stats: { luk: 10 } },
  { id: 'swiftBoots', name: '疾風の靴', slot: 'accessory', rarity: 'common', icon: 'boots', description: '足取りが軽くなる靴。', stats: { agi: 10 } },
  { id: 'powerBracelet', name: '力の腕輪', slot: 'accessory', rarity: 'rare', icon: 'ring', description: '腕に力がみなぎる。', stats: { str: 8 } },
  { id: 'wisdomPin', name: '知恵の髪飾り', slot: 'accessory', rarity: 'rare', icon: 'charm', description: '頭が冴えわたる髪飾り。', stats: { int: 8 } },
  { id: 'focusRing', name: '集中の指輪', slot: 'accessory', rarity: 'rare', icon: 'ring', description: 'フォーカスの最大値+1。', focusMax: 1 },
  { id: 'foresightAmulet', name: '先読みの首飾り', slot: 'accessory', rarity: 'epic', icon: 'amulet', description: '毎ターン、カードを1枚多く引く。', extraDraw: 1 , ability: { name: '未来視', description: 'スキルカードの完全成功でフォーカス+1', effect: { kind: 'onPerfectGainFocus', category: 'skill', amount: 1 } } },
  { id: 'guardTalisman', name: '守りの護符', slot: 'accessory', rarity: 'epic', icon: 'amulet', description: '戦闘開始時にブロック5。', startBlock: 5, stats: { vit: 5 } , ability: { name: '守護の光', description: 'ターン開始時に味方全員にブロック2', effect: { kind: 'turnStartBlock', amount: 2, allies: true } } },
  { id: 'heroCrest', name: '英雄の紋章', slot: 'accessory', rarity: 'legend', icon: 'crest', description: '伝説の英雄の証。', stats: { str: 5, vit: 5, int: 5, per: 5, dex: 5, agi: 5, luk: 5 }, focusMax: 1 , ability: { name: '英雄の魂', description: '与えるダメージ1.15倍', effect: { kind: 'damageMultiplier', multiplier: 1.15 } } },
];
