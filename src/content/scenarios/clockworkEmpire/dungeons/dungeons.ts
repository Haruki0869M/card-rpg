// シナリオ6のダンジョン。敵の組み合わせはダンジョンごと（雷だけが弱点の敵ばかりにならないよう、火・氷が弱点の敵を混ぜる）。
// 制覇すると動力核が壊れて鍵になり、3つそろうと最終ダンジョンに入れる。ボスの手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';
import { finaleLayout, keyLayout1, keyLayout2, keyLayout3 } from '../../../common/dungeonLayouts';

const FACTORY_POOLS: DungeonDef['pools'] = {
  battle: [['smokeStackCrow', 'brokenAutomaton'], ['conveyorBot', 'oilSlime'], ['riveter', 'sparkTurret'], ['voltGearBug', 'brokenAutomaton'], ['gearBug', 'conveyorBot', 'oilSlime']],
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
  // 7行目の中ボス（提案）
  midboss: ['furnaceGolem', 'ironCopperKnight'],
  boss: ['greatMachine'],
};

/** 廃品の洞窟（ランダム。谷〜炉の敵の寄せ集め） */
const SCRAP_POOLS: DungeonDef['pools'] = {
  battle: [['wrenchGolem', 'emberOilSlime'], ['clockworkDog', 'furnaceImp'], ['boilerCrab', 'pistonFist'], ['steamSprite', 'sparkTurret']],
  elite: [['steamTurretLord'], ['chainSaw']],
  boss: ['ironButler', 'chainSaw'],
};

type Layout = NonNullable<DungeonDef['layout']>;

// 部屋の並びは4つの型（src/content/common/dungeonLayouts.ts）を、このダンジョンのイベントで埋めた物
/** 歯車の工場（入門。ベルトコンベアとプレス機） */
const factoryLayout: Layout = keyLayout1({ first: 'gearConveyor', second: 'pressTrap', story: 'foremanOffice' });

/** 蒸気の発電所（蒸気のバルブと冷却水） */
const plantLayout: Layout = keyLayout2({ first: 'steamValve', second: 'coolantTank', story: 'boilerRoom' });

/** 時計塔（スクラップと行商ロボット） */
const towerLayout: Layout = keyLayout3({ first: 'scrapChest', second: 'peddlerBot', story: 'sageStudy' });

export const gearFactory: DungeonDef = {
  id: 'gearFactory',
  name: '歯車の工場',
  description: '止まらないベルトコンベアの工場。工場長ゴーレムが、動力核（歯車）を守っている。',
  background: 'gearFactory',
  baseLevel: 3,
  pools: FACTORY_POOLS,
  bossChest: 'epic',
  rewardKey: 'coreGear',
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
  // 1つ目のダンジョンの鍵が要る（play-feedback-plan §4 C: 町や依頼を飛ばして、まっすぐ奥へ行けないように）
  requiresKeys: ['coreGear'],
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
  // 2つ目の鍵と、町の依頼を1つ（報告まで）が要る（冒険を長くする。町に寄る理由を作る）
  requiresKeys: ['coreSteam'],
  requiresQuests: 1,
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
  layout: finaleLayout({ first: 'peddlerBot', story: 'machineHeartRoom' }),
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
  // 段階7a: 全5行（4行＋ボスの行）
  rows: 4,
};
