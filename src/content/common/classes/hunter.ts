import type { ClassDef } from '../../../types';

export const hunter: ClassDef = {
  id: 'hunter',
  order: 4,
  name: '狩人',
  role: '何でもこなす万能型',
  icon: '🏹',
  color: '#4caf50',
  baseMaxHp: 50,
  // 物理±0 / 魔法±0 / スキル+5
  stats: { str: 60, vit: 55, int: 60, per: 75, dex: 70, agi: 70, luk: 50 },
  deck: [
    { cardId: 'strike', count: 3 },
    { cardId: 'guard', count: 2 },
    { cardId: 'heavySwing', count: 1 },
    { cardId: 'gambleBolt', count: 1 },
    { cardId: 'shieldBash', count: 1 },
    { cardId: 'meditate', count: 2 },
  ],
  battleAbility: {
    id: 'weakSpot',
    name: '急所狙い',
    description: 'ダメージを与えるカードが完全成功すると、対象に脆弱1を付与',
    effect: { kind: 'onPerfectApplyStatus', status: 'vulnerable', amount: 1 },
  },
  exploreAbility: {
    id: 'tracking',
    name: '追跡',
    description: '隠し宝箱を見つけやすい（戦闘後に発見する確率+30%）。世界マップの視界+1（M3）',
    effect: { kind: 'tracking', vision: 1, hiddenFindBonus: 30 },
  },
  names: { male: ['カイ', 'リオ', 'ジェイド', 'アルト'], female: ['リナ', 'フィオ', 'シエラ', 'ネル'] },
  unlocked: true,
  hpPerLevel: 5,
  weaponType: 'bow',
  startingEquipment: { weapon: 'hunterBow', armor: 'travelerClothes' },
  cardPool: ['poisonArrow', 'rapidShot', 'vitalShot', 'setTrap', 'evade', 'gambleBolt', 'heavySwing', 'meditate', 'snipe', 'shadowArrow'],
  growthWeights: { dex: 3, per: 3, agi: 2, luk: 1 },
};
