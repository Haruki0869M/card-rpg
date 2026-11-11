import type { ClassDef } from '../../../types';
import { phantomThief } from './phantomThief';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const grandThief: ClassDef = {
  ...phantomThief, id: 'grandThief', order: 213, name: '大怪盗', role: '獲物の目で戦局を変える最上位職',
  tier: 'top', from: ['phantomThief'],
  baseMaxHp: phantomThief.baseMaxHp + 10,
  stats: { ...phantomThief.stats, luk: phantomThief.stats.luk + 8, dex: phantomThief.stats.dex + 8 },
  battleAbility: { name: '獲物の目', effect: { modifier: 'chestChance', bonus: 20 } },
  exploreAbility: { id: 'grandThiefExplore', name: '変装', description: '町の買い物25%引き', effect: { kind: 'shopDiscount', percent: 25 } },
  requires: { feat: 'goldEarned', count: 250, text: 'お金を合わせて250G稼ぐ' },
  cardPool: ["royalSwipe","thiefDecoy","treasureBlade","sageMeditation","plunder"], signature: ["royalSwipe","thiefDecoy","treasureBlade"],
  jobCards: ['plunder'],
};
