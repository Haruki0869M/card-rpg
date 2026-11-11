import type { ClassDef } from '../../../types';

// 中位ジョブ: 守護者 → 聖騎士 → 聖王（設計 v2 §3）
export const paladin: ClassDef = {
  id: 'paladin',
  order: 107,
  name: '聖騎士',
  role: 'かばって聖光をためる騎士',
  icon: '🛡️',
  color: '#f0d070',
  baseMaxHp: 84,
  stats: { str: 68, vit: 92, int: 30, per: 58, dex: 80, agi: 36, luk: 42 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '聖なる盾',
    description: 'ダメージを受けるたびに「聖光」+1（最大5）。聖光1つにつき、次の聖属性の攻撃+15%（使うと消える）',
    effect: { when: 'hurt', do: [{ kind: 'applyStatus', status: 'holyLight', amount: 1, to: 'self' }] },
  },
  exploreAbility: { id: 'purifyWalk', name: '浄化', description: '瘴気の判定+20%', effect: { kind: 'checkBonus', check: 'miasma', bonus: 20 } },
  names: { male: ['ガラハド', 'ローラン', 'エドガー', 'ルーク'], female: ['ジャンヌ', 'オリヴィア', 'エレナ', 'クレア'] },
  unlocked: true,
  hpPerLevel: 7,
  weaponType: 'hammer',
  subWeapons: ['sword', 'spear'],
  tier: 'mid',
  lineage: 'sei',
  from: ['guardian'],
  signature: ['holyStrike', 'aegis', 'divineJudgment'],
  startingEquipment: { weapon: 'oakHammer', armor: 'leatherArmor' },
  cardPool: ['holyStrike', 'aegis', 'divineJudgment', 'oath', 'lightHammer', 'martyr', 'axShieldSlam', 'axIronMarch', 'axThornVow'],
  growthWeights: { vit: 4, str: 2 },
};
