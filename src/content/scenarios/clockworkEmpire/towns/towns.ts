// シナリオ6の町（spec §17）。依頼は quests/quests.ts
import type { TownDef } from '../../../../types';

export const towns: TownDef[] = [
  {
    id: 'chimneyTown',
    name: '煙突の街ギア',
    description: '無数の煙突が並ぶ帝国の都。老技師が、旅人の無事を祈って工具を磨いている。',
    capital: true,
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare', fixed: ['potion'] },
    innCost: 15,
    removeCost: 25,
    quests: ['streetBots'],
  },
  {
    id: 'gearMarket',
    name: '歯車市場',
    description: '歯車や部品の露店が、ずらりと並ぶ市場。壊れた機械の噂ばかりが飛び交っている。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare' },
    innCost: 20,
    removeCost: 30,
    quests: ['blueprintQuest'],
  },
  {
    id: 'boilerCamp',
    name: 'ボイラー野営地',
    description: '蒸気の谷の入口にある野営地。熱を避けて、夜だけ人が集まる。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'epic' },
    innCost: 25,
    removeCost: 35,
    quests: ['boilerQuest'],
  },
  {
    id: 'foundryFort',
    name: '製鉄所の砦',
    description: '動力炉を見張る頑丈な砦。炉の火が、百年のあいだ消えたことがない。',
    shop: { cards: 3, equipment: 4, consumables: 3, maxRarity: 'epic' },
    innCost: 30,
    removeCost: 40,
    quests: ['clockSageQuest'],
  },
];
