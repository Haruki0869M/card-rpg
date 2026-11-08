// シナリオ3の町（spec §17）。依頼は quests/quests.ts
import type { TownDef } from '../../../../types';

export const towns: TownDef[] = [
  {
    id: 'harborTown',
    name: '港町アルカ',
    description: '群島でいちばん大きな港町。霧を恐れて出航できない船が、ずらりと並んでいる。老船長が船を貸してくれるという。',
    capital: true,
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare', fixed: ['potion'] },
    innCost: 15,
    removeCost: 25,
    quests: ['borrowShip', 'seaRaiders'],
  },
  {
    id: 'coralVillage',
    name: '珊瑚の村',
    description: '浅瀬の上に家が建ち並ぶ水上の村。真珠の細工が名物で、霧の海の話を聞ける。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'rare' },
    innCost: 20,
    removeCost: 30,
    quests: ['tideStoneQuest'],
  },
  {
    id: 'lighthouseHouse',
    name: '灯台守の家',
    description: '霧の海に浮かぶ小島の一軒家。灯台守の老婆が、昔の灯台の話を聞かせてくれる。',
    shop: { cards: 3, equipment: 3, consumables: 3, maxRarity: 'epic' },
    innCost: 25,
    removeCost: 35,
    quests: ['pirateCaptainQuest'],
  },
  {
    id: 'wreckTown',
    name: '難破船の街',
    description: '座礁した大きな船を、そのまま街にした場所。腕のいい船大工がいる。',
    shop: { cards: 3, equipment: 4, consumables: 3, maxRarity: 'epic' },
    innCost: 30,
    removeCost: 40,
    quests: ['sunkenTempleQuest'],
  },
];
