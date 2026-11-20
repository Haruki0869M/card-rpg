import type { ClassDef } from '../../../types';

// 中位ジョブ: 魔道士 → 呪術師 → 冥王。自分が付ける呪い・毒+1（設計 v2 §3）
export const hexer: ClassDef = {
  id: 'hexer',
  order: 105,
  name: '呪術師',
  role: '呪いと毒で蝕む',
  icon: '💀',
  color: '#9a4adf',
  baseMaxHp: 52,
  stats: { str: 32, vit: 46, int: 84, per: 66, dex: 62, agi: 50, luk: 56 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '呪詛',
    effect: { modifier: 'statusBonus', statuses: ['curse', 'poison'], amount: 1 },
  },
  exploreAbility: { id: 'forbiddenLore', name: '禁書', description: '石碑・魔法陣の判定+15%', effect: { kind: 'checkBonus', check: 'arcane', bonus: 15 } },
  names: { male: ['モルド', 'カシム', 'ネクス', 'ヴォル'], female: ['ヘカテ', 'リリス', 'ミラ', 'ノクス'] },
  unlocked: true,
  hpPerLevel: 4,
  weaponType: 'scythe',
  subWeapons: ['tome'],
  tier: 'mid',
  lineage: 'ma',
  from: ['mage'],
  signature: ['hex', 'plague', 'soulHarvest'],
  startingEquipment: { weapon: 'rustyScythe', armor: 'travelerClothes' },
  cardPool: ['hex', 'plague', 'soulHarvest', 'witherTouch', 'darkPact', 'doomSpell', 'axVenomBurst', 'axCurseReturn', 'axBloodPrice'],
  growthWeights: { int: 4, per: 2 },
};
