// シナリオ4の町（spec §17）。依頼は quests/quests.ts
import type { TownDef } from '../../../../types';

export const towns: TownDef[] = [
  {
    id: 'oasisTown',
    name: 'オアシスの町ハルカ',
    description: '砂漠の入口にある、泉のほとりの町。長老が、旅人の無事を祈って水を分けてくれる。',
    capital: true,
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare', fixed: ['potion'] },
    innCost: 15,
    removeCost: 25,
    quests: ['oasisRaiders'],
  },
  {
    id: 'ruinMarket',
    name: '廃墟の市場',
    description: '崩れかけた街の一角で、行商人たちが露店を開いている。砂に埋もれた宝の噂が絶えない。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare' },
    innCost: 20,
    removeCost: 30,
    quests: ['sunTabletQuest'],
  },
  {
    id: 'caravanPost',
    name: '隊商の宿',
    description: '砂丘の海に浮かぶ、小さな宿場。夜の寒さをしのぐ旅人で、いつも賑わっている。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'epic' },
    innCost: 25,
    removeCost: 35,
    quests: ['scorpionQuest'],
  },
  {
    id: 'tombWatch',
    name: '墓守の砦',
    description: '王家の谷を見張る古い砦。墓守の一族が、代々、王たちの眠りを守ってきた。',
    shop: { cards: 3, equipment: 4, consumables: 3, maxRarity: 'epic' },
    innCost: 30,
    removeCost: 40,
    quests: ['statueQuest'],
  },
];
