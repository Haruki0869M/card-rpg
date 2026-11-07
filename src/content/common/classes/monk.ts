import type { ClassDef } from '../../../types';

// 武闘家 → 闘士 → 拳王（spec §6.4）。同じターンに何枚も使うほど強い
export const monk: ClassDef = {
  id: 'monk',
  order: 5,
  name: '武闘家',
  role: '手数で押す格闘家',
  icon: '👊',
  color: '#ff9a3a',
  baseMaxHp: 56,
  stats: { str: 60, vit: 60, int: 25, per: 45, dex: 65, agi: 70, luk: 40 },
  deck: [
    { cardId: 'palmStrike', count: 3 },
    { cardId: 'guard', count: 3 },
    { cardId: 'flurry', count: 1 },
    { cardId: 'focusBreath', count: 2 },
    { cardId: 'ironBody', count: 1 },
  ],
  battleAbility: {
    name: '連撃',
    effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'playedThisTurn', atLeast: 1 }] },
  },
  exploreAbility: { id: 'swiftFeet', name: '健脚', description: '移動力の判定のスロット+1', effect: { kind: 'moveSlots', slots: 1 } },
  names: { male: ['リュウ', 'ガロウ', 'ジン', 'テツ'], female: ['メイリン', 'シャオ', 'リン', 'カエデ'] },
  unlocked: true,
  hpPerLevel: 6,
  weaponType: 'fist',
  tier: 'base',
  lineage: 'bu',
  startingEquipment: { weapon: 'clothWraps', armor: 'travelerClothes' },
  cardPool: ['flurry', 'risingKick', 'ironBody', 'focusBreath', 'palmStrike', 'sweep', 'charge', 'thousandFists', 'diamondStance'],
  growthWeights: { agi: 3, str: 2, dex: 2 },
};
