import type { ClassDef } from '../../../types';

// 中位ジョブ: 魔道士 → 大魔導士 → 大賢者（設計 v2 §3）
export const archmage: ClassDef = {
  id: 'archmage',
  order: 104,
  name: '大魔導士',
  role: '属性の大魔法で薙ぎ払う',
  icon: '🔮',
  color: '#7a5cff',
  baseMaxHp: 50,
  stats: { str: 30, vit: 40, int: 90, per: 66, dex: 72, agi: 52, luk: 56 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '詠唱短縮',
    description: '魔法カードを完全成功した時、マナ+1（1ターンに1回）',
    effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'oncePerTurn', key: 'quickCast' }], do: [{ kind: 'gainMana', amount: 1 }] },
  },
  exploreAbility: { id: 'arcaneSense', name: '魔力感知', description: '石碑・魔法陣の判定+20%', effect: { kind: 'checkBonus', check: 'arcane', bonus: 20 } },
  names: { male: ['マーリン', 'ゼノン', 'アルド', 'エリオ'], female: ['ミネルヴァ', 'ルーナ', 'セシル', 'アリア'] },
  unlocked: true,
  hpPerLevel: 4,
  weaponType: 'staff',
  subWeapons: ['tome'],
  tier: 'mid',
  lineage: 'ma',
  from: ['mage'],
  signature: ['flameStorm', 'frostNova', 'arcaneSurge'],
  startingEquipment: { weapon: 'oakStaff', armor: 'travelerClothes' },
  cardPool: ['flameStorm', 'frostNova', 'arcaneSurge', 'chainLightning', 'manaBarrier', 'starfall'],
  growthWeights: { int: 4, per: 2 },
};
