import type { ClassDef } from '../../../types';

// 中位ジョブ: 守護者 → 槍騎士 → 竜騎士（設計 v2 §3）
export const lancer: ClassDef = {
  id: 'lancer',
  order: 108,
  name: '槍騎士',
  role: '初手の突撃で貫く',
  icon: '🔱',
  color: '#3f7ad8',
  baseMaxHp: 80,
  stats: { str: 76, vit: 84, int: 24, per: 54, dex: 74, agi: 48, luk: 40 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '突撃',
    description: '戦闘の1ターン目：攻撃のダメージ×1.5',
    effect: { modifier: 'damageDealt', multiplier: 1.5, if: [{ kind: 'turnAtMost', turn: 1 }, { kind: 'cardHasDamage' }] },
  },
  exploreAbility: { id: 'mounted', name: '騎乗', description: '移動のサイコロ+1', effect: { kind: 'moveSlots', slots: 1 } },
  names: { male: ['ランス', 'ジークフリート', 'カイン', 'ヴォルフ'], female: ['ブリュンヒルデ', 'フレイヤ', 'エイル', 'ヴァルキリア'] },
  unlocked: true,
  hpPerLevel: 7,
  weaponType: 'spear',
  subWeapons: ['sword'],
  tier: 'mid',
  lineage: 'sei',
  from: ['guardian'],
  signature: ['lanceCharge', 'spearWall', 'skewer'],
  startingEquipment: { weapon: 'ironSpear', armor: 'leatherArmor' },
  cardPool: ['lanceCharge', 'spearWall', 'skewer', 'quickThrust', 'sweepLegs', 'dragonFang'],
  growthWeights: { str: 3, vit: 3 },
};
