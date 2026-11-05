import type { ClassDef } from '../../types';

export const warrior: ClassDef = {
  id: 'warrior',
  name: '戦士',
  role: '攻撃と防御の両立',
  icon: '🪓',
  color: '#e0563b',
  baseMaxHp: 60,
  // 適性補正 = (能力値 - 60) / 2 → 物理+5 / 魔法-15 / スキル±0
  stats: { str: 70, vit: 70, int: 30, per: 45, dex: 60, agi: 50, luk: 40 },
  deck: [
    { cardId: 'strike', count: 3 },
    { cardId: 'guard', count: 3 },
    { cardId: 'heavySwing', count: 2 },
    { cardId: 'shieldBash', count: 1 },
    { cardId: 'warCry', count: 1 },
  ],
  battleAbility: {
    id: 'fightingSpirit',
    name: '闘志',
    description: 'HPが半分以下の間、物理カードのダメージ+25%',
    effect: { kind: 'damageMultiplier', category: 'physical', multiplier: 1.25, whenSelfHpAtMostPct: 50 },
  },
  exploreAbility: {
    id: 'mightyStrength',
    name: '怪力',
    description: '障害物を壊すイベントの成功率+15%',
    effect: { kind: 'checkBonus', check: 'obstacle', bonus: 15 },
  },
  names: { male: ['レオン', 'ガイル', 'ロラン', 'バルド'], female: ['セリカ', 'アシュリー', 'イリス', 'カーラ'] },
  unlocked: true,
  hpPerLevel: 6,
  weaponType: 'sword',
  startingEquipment: { weapon: 'copperSword', armor: 'leatherArmor' },
  cardPool: ['mightyBlow', 'ironWall', 'sweep', 'battleCry', 'charge', 'heavySwing', 'shieldBash', 'warCry', 'berserkSlash', 'armorBreak'],
  growthWeights: { str: 3, vit: 3, dex: 1, agi: 1 },
};
