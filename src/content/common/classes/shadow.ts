import type { ClassDef } from '../../../types';

// 中位ジョブ: 盗賊 → 隠密 → 忍者。対象の悪い状態異常1種類につきダメージ+20%（設計 v2 §3）
export const shadow: ClassDef = {
  id: 'shadow',
  order: 112,
  name: '隠密',
  role: '弱らせて急所を突く',
  icon: '🥷',
  color: '#4a6a8a',
  baseMaxHp: 58,
  stats: { str: 50, vit: 50, int: 44, per: 68, dex: 82, agi: 84, luk: 66 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '急所突き',
    effect: { modifier: 'damageDealt', multiplier: 1, if: [{ kind: 'cardHasDamage' }], scale: { by: 'targetStatuses', per: 0.2 } },
  },
  exploreAbility: { id: 'stealthStep', name: '忍び足', description: '遭遇から逃げる判定+25%', effect: { kind: 'checkBonus', check: 'flee', bonus: 25 } },
  names: { male: ['カゲ', 'ハヤテ', 'ジン', 'クロウ'], female: ['カスミ', 'ツバキ', 'シノ', 'アヤメ'] },
  unlocked: true,
  hpPerLevel: 5,
  weaponType: 'dagger',
  subWeapons: ['katana'],
  tier: 'mid',
  lineage: 'gi',
  from: ['thief'],
  signature: ['cmTackle', 'caltrops', 'shadowKill'],
  startingEquipment: { weapon: 'rustyDagger', armor: 'travelerClothes' },
  cardPool: ['cmTackle', 'caltrops', 'shadowKill', 'smokeVeil', 'poisonNeedle', 'assassinate', 'axVenomBurst', 'axCollapse'],
  growthWeights: { agi: 3, dex: 3, per: 1 },
};
