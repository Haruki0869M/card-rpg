// シナリオ2の町（spec §17）。依頼は quests/quests.ts
import type { TownDef } from '../../../../types';

export const towns: TownDef[] = [
  {
    id: 'lampVillage',
    name: '灯火の村',
    description: '王国に残る最後の暖かい村。老いた書記官が、旅人の無事を祈って暖炉の火を絶やさない。',
    capital: true,
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare', fixed: ['potion'] },
    innCost: 15,
    removeCost: 25,
    quests: ['firewoodRun'],
  },
  {
    id: 'firewoodPost',
    name: '薪の宿場町',
    description: '雪林の入口にある宿場町。薪を山のように積んだ荷車が、いつも行き交っている。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare' },
    innCost: 20,
    removeCost: 30,
    quests: ['frozenSoldiers'],
  },
  {
    id: 'lakeVillage',
    name: '湖畔の漁村',
    description: '凍った湖のほとりの村。氷に穴を開けて釣る漁師たちが、沈んだ聖堂の言い伝えを語る。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'epic' },
    innCost: 25,
    removeCost: 35,
    quests: ['songStoneQuest'],
  },
  {
    id: 'fortressTown',
    name: '山麓の砦',
    description: '吹雪の山脈を見張る古い砦。鍛冶場の火だけは、百年のあいだ消えたことがない。',
    shop: { cards: 3, equipment: 4, consumables: 3, maxRarity: 'epic' },
    innCost: 30,
    removeCost: 40,
    quests: ['giantMineQuest'],
  },
];
