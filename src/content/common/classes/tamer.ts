import type { ClassDef } from '../../../types';

// 中位ジョブ: 狩人 → 獣使い → ビーストマスター（設計 v2 §3）
export const tamer: ClassDef = {
  id: 'tamer',
  order: 111,
  name: '獣使い',
  role: '相棒の獣と一緒に戦う',
  icon: '🐾',
  color: '#8bc34a',
  baseMaxHp: 60,
  stats: { str: 60, vit: 62, int: 54, per: 80, dex: 74, agi: 72, luk: 56 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '相棒の獣',
    description: '戦闘の初めから、相棒の獣が一緒に戦う（ターン終了時にランダムな敵へ4ダメージ）',
    effect: { when: 'battleStart', do: [{ kind: 'summon', id: 'companionBeast', name: '相棒の獣', icon: '🐾', damage: 4, turns: 99 }] },
  },
  exploreAbility: { id: 'beastNose', name: '獣の鼻', description: '隠し宝箱を見つけやすい（+25%）', effect: { kind: 'tracking', vision: 0, hiddenFindBonus: 25 } },
  names: { male: ['ガルム', 'レオ', 'バスク', 'トール'], female: ['ミーナ', 'ルル', 'ポム', 'ハナ'] },
  unlocked: true,
  hpPerLevel: 5,
  weaponType: 'whip',
  subWeapons: ['bow'],
  tier: 'mid',
  petMaster: true,
  lineage: 'gi',
  tags: ['scout'],
  from: ['hunter'],
  signature: ['packHunt', 'beastRoar', 'callFalcon'],
  startingEquipment: { weapon: 'leatherWhip', armor: 'travelerClothes' },
  cardPool: ['packHunt', 'beastRoar', 'callFalcon', 'whipCrack', 'feedBeast', 'stampede', 'axPetCharge', 'axPackHunt'],
  growthWeights: { per: 3, dex: 2, agi: 2 },
};
