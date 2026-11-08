// シナリオ5の町（spec §17）。依頼は quests/quests.ts
import type { TownDef } from '../../../../types';

export const towns: TownDef[] = [
  {
    id: 'cloudHarbor',
    name: '雲の港セレス',
    description: '空に浮かぶ白い港町。飛行船が行き交い、老天文官が夜空を見上げて旅人を見送る。',
    capital: true,
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare', fixed: ['potion'] },
    innCost: 15,
    removeCost: 25,
    quests: ['harborPatrol'],
  },
  {
    id: 'windInn',
    name: '風見の宿',
    description: '風の回廊の入口にある宿。屋根の風見鶏が、いつもくるくる回っている。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare' },
    innCost: 20,
    removeCost: 30,
    quests: ['skyBellQuest'],
  },
  {
    id: 'observatoryTown',
    name: '天文台の村',
    description: '星見の丘のふもとの村。村人はみな、星の動きで一日を決めている。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'epic' },
    innCost: 25,
    removeCost: 35,
    quests: ['librarianQuest'],
  },
  {
    id: 'moonGardenLodge',
    name: '月の庭の番小屋',
    description: '月の庭園を守る庭師の小屋。夜になると、庭の花が淡く光る。',
    shop: { cards: 3, equipment: 4, consumables: 3, maxRarity: 'epic' },
    innCost: 30,
    removeCost: 40,
    quests: ['moonMaidenQuest'],
  },
];
