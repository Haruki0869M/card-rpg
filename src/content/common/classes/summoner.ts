import type { ClassDef } from '../../../types';

// 召喚士 → 幻獣使い → 幻獣王（spec §6.4）。魔法を使うたびに幻獣ゲージがたまる
export const summoner: ClassDef = {
  id: 'summoner',
  order: 6,
  name: '召喚士',
  role: '幻獣を呼ぶ魔法使い',
  icon: '🔮',
  color: '#b06aff',
  baseMaxHp: 46,
  stats: { str: 25, vit: 40, int: 75, per: 65, dex: 55, agi: 50, luk: 55 },
  deck: [
    { cardId: 'phantomClaw', count: 3 },
    { cardId: 'guard', count: 3 },
    { cardId: 'spiritWard', count: 2 },
    { cardId: 'pact', count: 1 },
    { cardId: 'magicArrow', count: 1 },
  ],
  battleAbility: {
    name: '幻獣ゲージ',
    description: '魔法カードを3回使うごとに、幻獣がランダムな敵1体に9ダメージ',
    effect: { when: 'afterCard', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'everyN', n: 3, key: 'phantom' }], do: [{ kind: 'damage', amount: 9, to: 'randomFoe' }] },
  },
  exploreAbility: { id: 'spiritSense', name: '霊感', description: '祠とイベントのマスが、霧の中でも光って見える', effect: { kind: 'sense' } },
  names: { male: ['エルド', 'ミカエル', 'ソラ', 'ノア'], female: ['リリス', 'ミア', 'エレナ', 'ユーリ'] },
  unlocked: true,
  hpPerLevel: 4,
  weaponType: 'tome',
  subWeapons: ['staff'],
  tier: 'base',
  lineage: 'ma',
  startingEquipment: { weapon: 'apprenticeTome', armor: 'travelerClothes' },
  cardPool: ['phantomClaw', 'spiritWard', 'pact', 'elementalBurst', 'magicArrow', 'gambleBolt', 'callIfrit', 'callSylph', 'summonSprite', 'manaWell', 'axPetCharge'],
  growthWeights: { int: 3, per: 2, luk: 1 },
};
