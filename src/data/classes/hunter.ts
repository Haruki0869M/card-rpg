import type { ClassDef } from '../../types';

export const hunter: ClassDef = {
  id: 'hunter',
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
    description: '世界マップの視界+1。隠し宝箱を見つけやすい',
    effect: { kind: 'visionBonus', amount: 1 },
  },
  names: { male: ['カイ', 'リオ', 'ジェイド', 'アルト'], female: ['リナ', 'フィオ', 'シエラ', 'ネル'] },
  unlocked: true,
};
