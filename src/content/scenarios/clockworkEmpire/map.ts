// シナリオ6の世界マップ。下（煙突の街）から上（大機械の心臓）へ進む。蒸気の地（steam）は暑さでHPが減る。
// 敵の組み合わせは仮（共通の敵）。敵ができたら置き換える
import type { ScenarioMapDef } from '../../../types';

export const clockworkEmpireMap: ScenarioMapDef = {
  width: 8,
  height: 28,
  start: [3, 26],
  roadTerrain: 'road',
  regions: [
    {
      id: 'heartCore',
      name: '大機械の心臓部',
      intro: '巨大な歯車が、轟音を立てて回っている。壁も床も、すべて機械だ。',
      rows: [0, 2],
      terrain: { metal: 4, steam: 3, mountain: 1 },
      enemyLevel: 9,
      encounters: [['copperKnight', 'furnaceImp'], ['ironCopperKnight', 'venomBoilerCrab'], ['furnaceGolem'], ['ironCopperKnight', 'furnaceImp']],
      wanderers: 2,
    },
    {
      id: 'powerPlant',
      name: '動力炉',
      intro: '赤く燃える炉の熱で、空気が揺れている。配管から、白い蒸気が吹き出していた。',
      rows: [3, 8],
      terrain: { steam: 4, metal: 3, hills: 1 },
      enemyLevel: 7,
      encounters: [['ironClockworkDog', 'furnaceImp'], ['pistonFist', 'furnaceImp'], ['venomBoilerCrab', 'furnaceImp'], ['pistonFist', 'steamSprite']],
      wanderers: 4,
      chests: 2,
      events: 2,
      shrines: 1,
    },
    {
      id: 'steamValley',
      name: '蒸気の谷',
      intro: '谷底から、熱い蒸気が絶え間なく吹き上がる。足元の岩が、じりじりと熱い。',
      rows: [9, 15],
      terrain: { steam: 5, hills: 2, metal: 1 },
      enemyLevel: 5,
<<<<<<< HEAD
      encounters: [['steamSprite', 'wrenchGolem'], ['boilerCrab', 'clockworkDog'], ['emberOilSlime', 'clockworkDog'], ['steamSprite', 'sparkTurret']],
      rareEncounters: [['crimsonSteamHound'], ['crimsonSteamHound', 'clockworkDog']],
=======
      encounters: [['pressGolem', 'steamSprite'], ['steamSprite', 'wrenchGolem'], ['boilerCrab', 'clockworkDog'], ['emberOilSlime', 'clockworkDog'], ['steamSprite', 'sparkTurret']],
>>>>>>> ccr-d64a1cfc-debli5
      wanderers: 4,
      chests: 2,
      events: 2,
      shrines: 1,
      randomDungeons: ['scrapCave'],
    },
    {
      id: 'gearFactoryArea',
      name: '歯車の工場',
      intro: '無数のベルトコンベアが、ひとりでに動いている。作業員の姿は、どこにもない。',
      rows: [16, 21],
      terrain: { metal: 4, plains: 2, hills: 1 },
      enemyLevel: 3,
      encounters: [['conveyorBot', 'oilSlime'], ['riveter', 'brokenAutomaton'], ['voltGearBug', 'sparkTurret'], ['gearBug', 'gearBug', 'oilSlime']],
      wanderers: 4,
      chests: 2,
      events: 2,
      shrines: 1,
    },
    {
      id: 'chimneyTownArea',
      name: '煙突の街',
      intro: '無数の煙突が並ぶ、帝国の都。だが、街の機械が、少しずつおかしくなっている。',
      rows: [22, 27],
      terrain: { plains: 5, metal: 1, hills: 2 },
      enemyLevel: 1,
<<<<<<< HEAD
      encounters: [['gearBug', 'steamRat'], ['steamRat', 'brokenAutomaton'], ['gearBug', 'brokenAutomaton'], ['brokenAutomaton', 'gearBug', 'gearBug']],
      rareEncounters: [['brassClockCat'], ['brassClockCat', 'gearBug']],
=======
      encounters: [['smokeStackCrow', 'steamRat'], ['gearBug', 'steamRat'], ['steamRat', 'brokenAutomaton'], ['gearBug', 'brokenAutomaton'], ['brokenAutomaton', 'gearBug', 'gearBug']],
>>>>>>> ccr-d64a1cfc-debli5
      wanderers: 3,
      chests: 2,
      events: 2,
      shrines: 1,
    },
  ],
  features: [
    { kind: 'town', id: 'chimneyTown', at: [3, 26] },
    { kind: 'town', id: 'gearMarket', at: [5, 19] },
    { kind: 'town', id: 'boilerCamp', at: [2, 13] },
    { kind: 'town', id: 'foundryFort', at: [5, 8] },
    { kind: 'dungeon', id: 'gearFactory', at: [2, 17] },
    { kind: 'dungeon', id: 'steamPlant', at: [5, 11] },
    { kind: 'dungeon', id: 'clockTower', at: [2, 4] },
    { kind: 'dungeon', id: 'machineHeart', at: [4, 0] },
    { kind: 'landmark', id: 'oldBlueprint', at: [0, 22] },
  ],
  corruptionStages: [
    { at: 25, text: '機械の暴走が進み、魔物が増える。町が襲われはじめる', spawn: 3, raid: true },
    { at: 50, text: '魔物が凶暴になる（敵のレベル+1）。町への襲撃が続く', spawn: 2, enemyLevel: 1, raid: true },
    { at: 75, text: '魔物がさらに強くなる（敵のレベル+1）。国が歯車に呑まれかけている', spawn: 3, enemyLevel: 1, raid: true },
    { at: 100, text: '国が歯車に呑まれる（ゲームオーバー）' },
  ],
};
