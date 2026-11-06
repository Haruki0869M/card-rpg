// シナリオ1の町（spec §17）
import type { TownDef } from '../../../../types';

export const towns: TownDef[] = [
  {
    id: 'royalCapital',
    name: '王都アルセリア',
    description: '大陸でいちばん大きな都。老賢者が旅の無事を祈っている。',
    capital: true,
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare', fixed: ['holyWater'] },
    innCost: 15,
    removeCost: 25,
    quests: ['wolfHunt'],
  },
  {
    id: 'forestVillage',
    name: '翠の森の村',
    description: '大樹の根元に寄り添う小さな村。神殿の伝承が残る。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare' },
    innCost: 20,
    removeCost: 30,
    quests: ['ancientEmblem'],
  },
  {
    id: 'swampHamlet',
    name: '沼のほとりの集落',
    description: '霧に沈む集落。墓守の老人が地下墓所を見張っている。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'epic' },
    innCost: 25,
    removeCost: 35,
    quests: ['holyWater'],
  },
  {
    id: 'foothillVillage',
    name: '火山の麓の村',
    description: '腕利きの鍛冶屋がいる村。熱い風が吹き下ろしてくる。',
    shop: { cards: 3, equipment: 4, consumables: 3, maxRarity: 'epic' },
    innCost: 30,
    removeCost: 40,
    quests: ['legendSmith'],
  },
];
