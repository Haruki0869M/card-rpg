// シナリオ7の町（spec §17）。依頼は quests/quests.ts
import type { TownDef } from '../../../../types';

export const towns: TownDef[] = [
  {
    id: 'dreamGate',
    name: '目覚めの宿',
    description: '夢の入口にある小さな宿。夢守りの老婆が、旅人の名前を一人ずつ覚えてくれている。',
    capital: true,
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare', fixed: ['potion'] },
    innCost: 15,
    removeCost: 25,
    quests: ['dreamPatrol'],
  },
  {
    id: 'memoryBazaar',
    name: '記憶の市場',
    description: '誰かの思い出を売り買いする不思議な市場。見覚えのある品が、ふと並んでいる。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare' },
    innCost: 20,
    removeCost: 30,
    quests: ['fountainQuest'],
  },
  {
    id: 'lanternHill',
    name: '提灯の丘',
    description: '無数の提灯が揺れる丘の宿場。白い息の旅人が、温かいお茶を飲んでいる。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'epic' },
    innCost: 25,
    removeCost: 35,
    quests: ['iceEchoQuest'],
  },
  {
    id: 'driftingInn',
    name: 'さまよう宿',
    description: '夢の中を、ゆっくり動き回る宿。昨日とは違う景色の中に、いつも建っている。',
    shop: { cards: 3, equipment: 4, consumables: 3, maxRarity: 'epic' },
    innCost: 30,
    removeCost: 40,
    quests: ['ghostEchoQuest'],
  },
];
