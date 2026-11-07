import type { ClassDef } from '../../../types';

// 中位ジョブ: 剣士 → 狂戦士 → 覇王。HPが減るほど与えるダメージが増える（最大+50%）（設計 v2 §3）
export const berserker: ClassDef = {
  id: 'berserker',
  order: 102,
  name: '狂戦士',
  role: 'HPを削って暴れる',
  icon: '🪓',
  color: '#b8322a',
  baseMaxHp: 78,
  stats: { str: 84, vit: 76, int: 24, per: 40, dex: 56, agi: 54, luk: 40 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '血の滾り',
    effect: { modifier: 'damageDealt', multiplier: 1, if: [{ kind: 'cardHasDamage' }], scale: { by: 'missingHp', per: 0.6, max: 0.5 } },
  },
  exploreAbility: { id: 'charge', name: '突進', description: '移動力の判定のスロット+1', effect: { kind: 'moveSlots', slots: 1 } },
  names: { male: ['グラム', 'ボルグ', 'ザイン', 'ドラン'], female: ['ヒルダ', 'ブレンダ', 'イグニス', 'ロゼ'] },
  unlocked: true,
  hpPerLevel: 7,
  weaponType: 'axe',
  subWeapons: ['sword'],
  tier: 'mid',
  lineage: 'bu',
  from: ['warrior'],
  signature: ['recklessSwing', 'bloodRage', 'ragingStorm'],
  startingEquipment: { weapon: 'woodAxe', armor: 'leatherArmor' },
  cardPool: ['recklessSwing', 'bloodRage', 'ragingStorm', 'cleaveThrough', 'warHowl', 'bloodFeast'],
  growthWeights: { str: 4, vit: 3 },
};
