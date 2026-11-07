import type { ClassDef } from '../../../types';

// 中位ジョブ: 武闘家 → 闘士 → 拳王。2枚目からの物理ダメージ×1.4（設計 v2 §3）
export const brawler: ClassDef = {
  id: 'brawler',
  order: 103,
  name: '闘士',
  role: '手数で圧倒する格闘家',
  icon: '👊',
  color: '#ff9a3a',
  baseMaxHp: 66,
  stats: { str: 68, vit: 68, int: 28, per: 50, dex: 72, agi: 78, luk: 42 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '猛連撃',
    effect: { modifier: 'damageDealt', multiplier: 1.4, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'playedThisTurn', atLeast: 1 }] },
  },
  exploreAbility: { id: 'training', name: '鍛錬', description: '野営でフォーカスも1回復する', effect: { kind: 'campFocus', amount: 1 } },
  names: { male: ['ゴウ', 'リュウジ', 'ハオ', 'ケン'], female: ['ランファ', 'ミン', 'スズ', 'アカネ'] },
  unlocked: true,
  hpPerLevel: 6,
  weaponType: 'fist',
  subWeapons: [],
  tier: 'mid',
  lineage: 'bu',
  from: ['monk'],
  signature: ['comboRush', 'chiBurst', 'hundredKicks'],
  startingEquipment: { weapon: 'clothWraps', armor: 'travelerClothes' },
  cardPool: ['comboRush', 'chiBurst', 'hundredKicks', 'jab2', 'guardBreak', 'fistOfFury'],
  growthWeights: { agi: 3, str: 2, dex: 2 },
};
