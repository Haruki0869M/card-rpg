import type { ClassDef } from '../../../types';

export const guardian: ClassDef = {
  id: 'guardian',
  order: 3,
  name: '守護者',
  role: '仲間を守る盾役',
  icon: '🛡️',
  color: '#3fa0d8',
  baseMaxHp: 72,
  // 物理±0 / 魔法-20 / スキル+10
  stats: { str: 60, vit: 85, int: 20, per: 50, dex: 80, agi: 35, luk: 40 },
  deck: [
    { cardId: 'strike', count: 2 },
    { cardId: 'guard', count: 3 },
    { cardId: 'shieldBash', count: 2 },
    { cardId: 'warCry', count: 2 },
    { cardId: 'meditate', count: 1 },
  ],
  battleAbility: {
    name: 'かばう',
    effect: { modifier: 'coverLethal', chance: 30 },
  },
  exploreAbility: {
    id: 'nightWatch',
    name: '見張り',
    description: '野営中の夜襲の確率を半分にする',
    effect: { kind: 'nightAmbushReduction', multiplier: 0.5 },
  },
  names: { male: ['ゴードン', 'ハンス', 'ドルフ', 'ラガン'], female: ['ブレンダ', 'ヒルダ', 'マルタ', 'ジーナ'] },
  unlocked: true,
  hpPerLevel: 7,
  weaponType: 'hammer',
  // 絵（槍と盾）に合わせて、最初の武器は槍。槌も得意（spec §6.4）
  subWeapons: ['spear', 'sword'],
  tier: 'base',
  lineage: 'sei',
  startingEquipment: { weapon: 'ironSpear', armor: 'leatherArmor' },
  cardPool: ['guardFormation', 'guard', 'holyLight', 'shieldBash', 'rally', 'warCry', 'judgment', 'sanctuary', 'axShieldSlam', 'axFortress', 'axIronMarch'],
  growthWeights: { vit: 4, dex: 2, str: 2 },
};
