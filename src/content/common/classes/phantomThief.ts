import type { ClassDef } from '../../../types';

// 中位ジョブ: 盗賊 → 怪盗 → 大怪盗。敵を倒すとお金+6（設計 v2 §3）
export const phantomThief: ClassDef = {
  id: 'phantomThief',
  order: 113,
  name: '怪盗',
  role: '奪って稼ぐ華麗な盗賊',
  icon: '🎩',
  color: '#d0a040',
  baseMaxHp: 58,
  stats: { str: 50, vit: 50, int: 50, per: 66, dex: 80, agi: 80, luk: 78 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '掠め取り',
    effect: { when: 'kill', do: [{ kind: 'gainGold', amount: 6 }] },
  },
  exploreAbility: { id: 'disguise', name: '変装', description: '町の買い物が15%引き', effect: { kind: 'shopDiscount', percent: 15 } },
  names: { male: ['ルパン', 'クロード', 'ジル', 'アルセーヌ'], female: ['キャット', 'ミレイユ', 'ローズ', 'ジゼル'] },
  unlocked: true,
  hpPerLevel: 5,
  weaponType: 'dagger',
  subWeapons: [],
  tier: 'mid',
  lineage: 'gi',
  from: ['thief'],
  signature: ['swipe', 'flourish', 'grandHeist'],
  startingEquipment: { weapon: 'rustyDagger', armor: 'travelerClothes' },
  cardPool: ['swipe', 'flourish', 'grandHeist', 'feint', 'luckyCoin', 'phantomDance', 'axFlowingStrikes'],
  growthWeights: { luk: 3, dex: 2, agi: 2 },
};
