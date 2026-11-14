import type { ClassDef } from '../../../types';

// 中位ジョブ: 召喚士 → 幻獣使い → 幻獣王（設計 v2 §3）
export const phantomTamer: ClassDef = {
  id: 'phantomTamer',
  order: 106,
  name: '幻獣使い',
  role: '幻獣と並んで戦う',
  icon: '🦄',
  color: '#b06aff',
  baseMaxHp: 54,
  stats: { str: 28, vit: 48, int: 82, per: 72, dex: 60, agi: 54, luk: 58 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '幻獣の絆',
    description: '魔法カードを3回使うたびに、幻獣が2ターン一緒に戦う（ターン終了時にランダムな敵へ6ダメージ）',
    effect: { when: 'afterCard', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'everyN', n: 3, key: 'phantomBond' }], do: [{ kind: 'summon', id: 'bondPhantom', name: '幻獣', icon: '✨', damage: 6, turns: 2 }] },
  },
  exploreAbility: { id: 'familiar', name: '使い魔', description: '世界マップの視界+1', effect: { kind: 'tracking', vision: 1, hiddenFindBonus: 0 } },
  names: { male: ['シオン', 'ユーリ', 'ラーズ', 'ネロ'], female: ['フェリス', 'ティア', 'ユキナ', 'ソラ'] },
  unlocked: true,
  hpPerLevel: 4,
  weaponType: 'tome',
  subWeapons: ['staff'],
  tier: 'mid',
  lineage: 'ma',
  from: ['summoner'],
  signature: ['summonWolfSpirit', 'phantomLink', 'summonPhoenix'],
  startingEquipment: { weapon: 'apprenticeTome', armor: 'travelerClothes' },
  cardPool: ['summonWolfSpirit', 'phantomLink', 'summonPhoenix', 'spiritShield', 'lnGiTrick', 'summonTortoise'],
  growthWeights: { int: 3, per: 3 },
};
