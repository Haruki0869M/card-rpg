// シナリオ6のダンジョン。敵の組み合わせはダンジョンごと（雷だけが弱点の敵ばかりにならないよう、火・氷が弱点の敵を混ぜる）。
// 制覇すると動力核が壊れて鍵になり、3つそろうと最終ダンジョンに入れる。ボスの手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';

const FACTORY_POOLS: DungeonDef['pools'] = {
  battle: [['smokeStackCrow', 'conveyorBot'], ['conveyorBot', 'oilSlime'], ['riveter', 'sparkTurret'], ['voltGearBug', 'brokenAutomaton'], ['gearBug', 'conveyorBot', 'oilSlime']],
  elite: [['foremanBot', 'brokenAutomaton'], ['stormForemanBot', 'oilSlime']],
  boss: ['foremanGolem'],
};

const PLANT_POOLS: DungeonDef['pools'] = {
  battle: [['pressGolem', 'steamSprite'], ['steamSprite', 'wrenchGolem'], ['boilerCrab', 'clockworkDog'], ['emberOilSlime', 'wrenchGolem'], ['sparkTurret', 'clockworkDog']],
  elite: [['steamTurretLord', 'clockworkDog'], ['steamTurretLord']],
  boss: ['runawayBoiler'],
};

const TOWER_POOLS: DungeonDef['pools'] = {
  battle: [['ironClockworkDog', 'furnaceImp'], ['pistonFist', 'furnaceImp'], ['venomBoilerCrab', 'pistonFist'], ['furnaceImp', 'wrenchGolem'], ['venomBoilerCrab', 'furnaceImp']],
  elite: [['ironButler', 'furnaceImp'], ['chainSaw']],
  boss: ['clockworkSage'],
};

const HEART_POOLS: DungeonDef['pools'] = {
  battle: [['copperKnight', 'furnaceImp'], ['ironCopperKnight', 'furnaceImp'], ['copperKnight', 'venomBoilerCrab']],
  elite: [['furnaceGolem'], ['furnaceGolem', 'copperKnight']],
  boss: ['greatMachine'],
};

/** 廃品の洞窟（ランダム。谷〜炉の敵の寄せ集め） */
const SCRAP_POOLS: DungeonDef['pools'] = {
  battle: [['wrenchGolem', 'emberOilSlime'], ['clockworkDog', 'furnaceImp'], ['boilerCrab', 'pistonFist'], ['steamSprite', 'sparkTurret']],
  elite: [['steamTurretLord'], ['chainSaw']],
  boss: ['ironButler', 'chainSaw'],
};

type Layout = NonNullable<DungeonDef['layout']>;

/** 歯車の工場（8行。入門。ベルトコンベアとプレス機） */
const factoryLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'event', eventId: 'gearConveyor', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0] },
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [1] },
  ],
  [
    { type: 'event', eventId: 'pressTrap', next: [0] },
    { type: 'elite', next: [0, 1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'foremanOffice', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 蒸気の発電所（8行。蒸気のバルブと冷却水。強敵が2回） */
const plantLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: 'steamValve', next: [0, 1] },
    { type: 'battle', next: [1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
    { type: 'elite', next: [0, 1] },
    { type: 'event', eventId: 'coolantTank', next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'boilerRoom', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 時計塔（9行。スクラップと行商ロボット。分かれ道が多い） */
const towerLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'battle', next: [1, 2] },
  ],
  [
    { type: 'event', eventId: 'scrapChest', next: [0] },
    { type: 'battle', next: [0, 1] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [1] },
  ],
  [
    { type: 'elite', next: [0, 1] },
    { type: 'rest', next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'event', eventId: 'peddlerBot', next: [0, 1] },
  ],
  [
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
    { type: 'elite', next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'sageStudy', next: [0] }],
  [{ type: 'boss', next: [] }],
];

export const gearFactory: DungeonDef = {
  id: 'gearFactory',
  name: '歯車の工場',
  description: '止まらないベルトコンベアの工場。工場長ゴーレムが、動力核（歯車）を守っている。',
  background: 'gearFactory',
  baseLevel: 3,
  pools: FACTORY_POOLS,
  bossChest: 'epic',
  rewardKey: 'coreGear',
  corruptionOnClear: 5,
  clearStory: ['工場長ゴーレムが、動かなくなった。', '工場のベルトが、静かに止まる。', '動力核（歯車）を壊した！'],
  layout: factoryLayout,
};

export const steamPlant: DungeonDef = {
  id: 'steamPlant',
  name: '蒸気の発電所',
  description: '蒸気の谷にある巨大な発電所。暴走ボイラーが、動力核（蒸気）を抱えている。',
  background: 'steamPlant',
  baseLevel: 5,
  pools: PLANT_POOLS,
  bossChest: 'epic',
  rewardKey: 'coreSteam',
  corruptionOnClear: 5,
  clearStory: ['暴走ボイラーの炎が、消えた。', '発電所から、蒸気が引いていく。', '動力核（蒸気）を壊した！'],
  layout: plantLayout,
};

export const clockTower: DungeonDef = {
  id: 'clockTower',
  name: '時計塔',
  description: '動力炉の奥にそびえる巨大な時計塔。時計仕掛けの賢者が、動力核（時間）を守っている。',
  background: 'clockTower',
  baseLevel: 7,
  pools: TOWER_POOLS,
  bossChest: 'legend',
  rewardKey: 'coreTime',
  corruptionOnClear: 5,
  clearStory: ['時計仕掛けの賢者の針が、止まった。', '「大機械を…止めてやってくれ」', '動力核（時間）を壊した！'],
  layout: towerLayout,
};

export const machineHeart: DungeonDef = {
  id: 'machineHeart',
  name: '大機械の心臓',
  description: '大機械の心臓部。三つの動力核を壊さなければ、鋼の扉は開かない。',
  background: 'machineHeart',
  baseLevel: 9,
  pools: HEART_POOLS,
  bossChest: 'legend',
  requiresKeys: ['coreGear', 'coreSteam', 'coreTime'],
  finale: true,
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'battle', next: [1] },
    ],
    [
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
      { type: 'battle', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'elite', next: [0] }],
    [{ type: 'battle', next: [0] }],
    [{ type: 'rest', next: [0] }],
    [{ type: 'battle', next: [0] }],
    [{ type: 'event', eventId: 'machineHeartRoom', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

// ランダムダンジョン: 廃品の洞窟（部屋の並びを自動生成）
export const scrapCave: DungeonDef = {
  id: 'scrapCave',
  name: '廃品の洞窟',
  description: '訪れるたびに姿を変えるスクラップの洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'forestCave',
  baseLevel: 6,
  pools: SCRAP_POOLS,
  bossChest: 'legend',
  random: true,
  rows: 6,
};
