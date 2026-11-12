import type { ClassDef } from '../../../types';

// 中位ジョブ: 狩人 → 弓術士 → 弓聖（設計 v2 §3）
export const archer: ClassDef = {
  id: 'archer',
  order: 110,
  name: '弓術士',
  role: '1体を確実に射抜く',
  icon: '🏹',
  color: '#4caf50',
  baseMaxHp: 58,
  stats: { str: 62, vit: 58, int: 58, per: 86, dex: 80, agi: 74, luk: 52 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '狙い撃ち',
    effect: { modifier: 'cardChance', bonus: 10, if: [{ kind: 'cardSingleTarget' }, { kind: 'cardHasDamage' }] },
  },
  exploreAbility: { id: 'firstStrike', name: '先手', description: '遭遇の奇襲の判定+20%', effect: { kind: 'checkBonus', check: 'ambush', bonus: 20 } },
  names: { male: ['ロビン', 'ウィル', 'エルク', 'ファルコ'], female: ['アルテミス', 'シルフィ', 'ニナ', 'レイン'] },
  unlocked: true,
  hpPerLevel: 5,
  weaponType: 'bow',
  subWeapons: ['dagger'],
  tier: 'mid',
  lineage: 'gi',
  tags: ['scout'],
  from: ['hunter'],
  signature: ['cmAllOut', 'arrowRain', 'piercingArrow'],
  startingEquipment: { weapon: 'hunterBow', armor: 'travelerClothes' },
  cardPool: ['cmAllOut', 'arrowRain', 'piercingArrow', 'quickShot', 'cmBreather', 'stormOfArrows', 'axWeakSight', 'axVitalShot'],
  growthWeights: { per: 3, dex: 3, agi: 1 },
};
