import type { ClassDef } from '../../../types';

export const mage: ClassDef = {
  id: 'mage',
  order: 2,
  name: '魔道士',
  role: '高火力の博打',
  icon: '🔮',
  color: '#7a5cff',
  baseMaxHp: 42,
  // 物理-15 / 魔法+10 / スキル+5
  stats: { str: 30, vit: 35, int: 80, per: 60, dex: 70, agi: 50, luk: 55 },
  deck: [
    { cardId: 'magicArrow', count: 3 },
    { cardId: 'guard', count: 3 },
    { cardId: 'gambleBolt', count: 2 },
    { cardId: 'meditate', count: 2 },
  ],
  battleAbility: {
    name: '魔力暴走',
    effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }], do: [{ kind: 'damage', amount: 5, to: 'randomFoe' }] },
  },
  exploreAbility: {
    id: 'ancientLore',
    name: '古文書解読',
    description: '石碑・魔法陣のイベントで選択肢が1つ増える',
    effect: { kind: 'extraEventOption', tag: 'arcane' },
  },
  names: { male: ['エルド', 'ノア', 'シオン', 'ユリウス'], female: ['ミーナ', 'ルーシア', 'エマ', 'ソフィア'] },
  unlocked: true,
  hpPerLevel: 4,
  weaponType: 'staff',
  subWeapons: ['tome'],
  tier: 'base',
  lineage: 'ma',
  startingEquipment: { weapon: 'oakStaff', armor: 'travelerClothes' },
  cardPool: ['fireball', 'iceLance', 'thunder', 'manaShield', 'deepFocus', 'gambleBolt', 'meditate', 'magicArrow', 'meteor', 'soulDrain', 'axBlazeCatalyst'],
  growthWeights: { int: 4, dex: 2, luk: 1, per: 1 },
};
