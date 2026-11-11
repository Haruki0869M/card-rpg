import type { ClassDef } from '../../../types';

// 盗賊 → 隠密 → 忍者 / 盗賊 → 怪盗 → 大怪盗（spec §6.4）。攻撃のたびに敵のブロックを盗む
export const thief: ClassDef = {
  id: 'thief',
  order: 8,
  name: '盗賊',
  role: '素早く奪う',
  icon: '🗡️',
  color: '#6ad8a0',
  baseMaxHp: 50,
  stats: { str: 45, vit: 45, int: 40, per: 60, dex: 70, agi: 75, luk: 65 },
  deck: [
    { cardId: 'pilfer', count: 3 },
    { cardId: 'guard', count: 2 },
    { cardId: 'smokeVeil', count: 2 },
    { cardId: 'strike', count: 2 },
    { cardId: 'poisonBlade', count: 1 },
  ],
  battleAbility: {
    name: '盗む',
    effect: { when: 'afterCard', if: [{ kind: 'cardHasDamage' }], do: [{ kind: 'steal', amount: 3 }] },
  },
  exploreAbility: { id: 'lockpick', name: '鍵師', description: '鍵開けの判定+20%', effect: { kind: 'checkBonus', check: 'lock', bonus: 20 } },
  names: { male: ['カイ', 'ジャック', 'ロイ', 'ゼン'], female: ['ニーナ', 'ルル', 'キャット', 'ミラ'] },
  unlocked: true,
  hpPerLevel: 5,
  weaponType: 'dagger',
  tier: 'base',
  lineage: 'gi',
  startingEquipment: { weapon: 'rustyDagger', armor: 'travelerClothes' },
  cardPool: ['pilfer', 'smokeVeil', 'poisonBlade', 'backstab', 'strike', 'shadowSteal', 'venomRain', 'dirtyTrick', 'quickFingers'],
  growthWeights: { agi: 3, dex: 2, luk: 2 },
};
