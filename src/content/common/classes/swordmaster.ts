import type { ClassDef } from '../../../types';

// 中位ジョブ: 剣士 → 剣豪 → 剣聖。完全成功で同じ敵に追加の一撃（設計 v2 §3）
export const swordmaster: ClassDef = {
  id: 'swordmaster',
  order: 101,
  name: '剣豪',
  role: '完全成功と追撃の剣の達人',
  icon: '⚔️',
  color: '#e0563b',
  baseMaxHp: 70,
  stats: { str: 78, vit: 72, int: 32, per: 58, dex: 70, agi: 56, luk: 42 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '見切り',
    effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardSingleTarget' }], do: [{ kind: 'echoHit', pct: 50 }] },
  },
  exploreAbility: { id: 'mastersEye', name: '達人の目', description: '遭遇の奇襲の判定+15%', effect: { kind: 'checkBonus', check: 'ambush', bonus: 15 } },
  names: { male: ['ムサシ', 'レイガ', 'アルス', 'ヴァン'], female: ['シズカ', 'セレス', 'カグヤ', 'リーゼ'] },
  unlocked: true,
  hpPerLevel: 6,
  weaponType: 'sword',
  subWeapons: ['katana'],
  tier: 'mid',
  lineage: 'bu',
  from: ['warrior'],
  signature: ['swordDance', 'cmGrit', 'flashCut'],
  startingEquipment: { weapon: 'copperSword', armor: 'leatherArmor' },
  cardPool: ['swordDance', 'cmGrit', 'flashCut', 'lnBuCounter', 'lnBuFlurry', 'masterStroke'],
  growthWeights: { str: 3, dex: 3, per: 2 },
};
