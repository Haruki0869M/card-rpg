// シナリオ5のダンジョン。
// 敵の組み合わせはダンジョンごと（enemies/ の専用の敵）。
// 制覇すると星環が手に入り、3つそろうと最終ダンジョンに入れる。ボスの手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';
import { finaleLayout, keyLayout1, keyLayout2, keyLayout3 } from '../../../common/dungeonLayouts';

const WINDMILL_POOLS: DungeonDef['pools'] = {
  battle: [['windSprite', 'clockworkSoldier'], ['starJelly', 'gearBeetle'], ['stormWindSprite', 'clockworkSoldier'], ['windSprite', 'starJelly', 'gearBeetle']],
  elite: [['windGuardianHawk'], ['windGuardianHawk', 'clockworkSoldier']],
  boss: ['windKeeper'],
};

const OBSERVATORY_POOLS: DungeonDef['pools'] = {
  battle: [['cometFox', 'moonRabbit'], ['shootingStarBird', 'moonRabbit'], ['starFragment', 'gearBeetle'], ['moonRabbit', 'starFragment'], ['shootingStarBird', 'gearBeetle', 'starFragment'], ['angelStatue', 'starFragment']],
  elite: [['starDustScribe'], ['shadowStarDustScribe', 'starFragment'], ['clockworkKnight']],
  boss: ['starLibrarian'],
};

const GARDEN_POOLS: DungeonDef['pools'] = {
  battle: [['harpGuardian', 'moonWolf'], ['moonWolf', 'thornFairy'], ['shadowMoonRabbit', 'thornFairy'], ['moonWolf', 'starFragment'], ['thornFairy', 'thornFairy', 'moonWolf'], ['hourglassGolem', 'thornFairy']],
  elite: [['moonGardener'], ['moonGardener', 'thornFairy']],
  boss: ['moonMaiden'],
};

const CASTLE_POOLS: DungeonDef['pools'] = {
  battle: [['holyMoonWolf', 'venomThornFairy'], ['skyKnight', 'venomThornFairy'], ['skyKnight', 'moonWolf'], ['venomThornFairy', 'skyKnight', 'starFragment'], ['skyKnight', 'shadowMoonRabbit'], ['holyAngelStatue', 'venomThornFairy']],
  elite: [['skyPaladin']],
  // 7行目の中ボス（提案）
  midboss: ['skyPaladin', 'skyKnight'],
  boss: ['starSeerQueen'],
};

const CAVE_POOLS: DungeonDef['pools'] = {
  battle: [['moonRabbit', 'gearBeetle'], ['moonWolf', 'starFragment'], ['shootingStarBird', 'thornFairy'], ['starJelly', 'moonRabbit', 'starFragment'], ['angelStatue', 'hourglassGolem']],
  elite: [['starDustScribe'], ['moonGardener']],
  boss: ['clockworkKnight', 'moonGardener'],
};

type Layout = NonNullable<DungeonDef['layout']>;

// 部屋の並びは4つの型（src/content/common/dungeonLayouts.ts）を、このダンジョンのイベントで埋めた物
/** 風車の塔（入門。突風と星屑の箱） */
const windmillLayout: Layout = keyLayout1({ first: 'skyWindGap', second: 'starDustChest', story: 'windKeeperHall' });

/** 星見の天文台（壁画と時計仕掛けの罠） */
const observatoryLayout: Layout = keyLayout2({ first: 'constellationMural', second: 'clockworkTrap', story: 'librarianDesk' });

/** 月光の庭（泉と飛行船の行商人） */
const moonGardenLayout: Layout = keyLayout3({ first: 'moonPetalFountain', second: 'skyPeddler', story: 'moonMaidenGarden' });

export const windmillTower: DungeonDef = {
  id: 'windmillTower',
  name: '風車の塔',
  description: '風の回廊の先にそびえる、巨大な風車の塔。風の番人が、星環（風）を守っている。',
  background: 'windmillTower',
  baseLevel: 3,
  pools: WINDMILL_POOLS,
  bossChest: 'epic',
  rewardKey: 'ringWind',
  clearStory: ['風の番人が、風になって消えた。', '塔の風車が、静かに回りだす。', '星環（風）を手に入れた！'],
  layout: windmillLayout,
};

export const observatory: DungeonDef = {
  id: 'observatory',
  name: '星見の天文台',
  description: '星の記録が眠る古い天文台。星の司書が、星環（星）を守っている。',
  background: 'observatory',
  baseLevel: 5,
  pools: OBSERVATORY_POOLS,
  bossChest: 'epic',
  rewardKey: 'ringStar',
  // 1つ目のダンジョンの鍵が要る（play-feedback-plan §4 C: 町や依頼を飛ばして、まっすぐ奥へ行けないように）
  requiresKeys: ['ringWind'],
  clearStory: ['星の司書は、本を閉じて微笑んだ。', '「女王様を…お願いします」', '星環（星）を手に入れた！'],
  layout: observatoryLayout,
};

export const moonlitGarden: DungeonDef = {
  id: 'moonlitGarden',
  name: '月光の庭',
  description: '月の光が降りそそぐ、天空城の庭園。月の乙女が、星環（月）を抱いて眠っている。',
  background: 'moonlitGarden',
  baseLevel: 7,
  pools: GARDEN_POOLS,
  bossChest: 'legend',
  rewardKey: 'ringMoon',
  // 2つ目の鍵と、町の依頼を1つ（報告まで）が要る（冒険を長くする。町に寄る理由を作る）
  requiresKeys: ['ringStar'],
  requiresQuests: 1,
  clearStory: ['月の乙女が、花びらになって舞った。', '「ありがとう。女王様を、どうか」', '星環（月）を手に入れた！'],
  layout: moonGardenLayout,
};

export const skyCastle: DungeonDef = {
  id: 'skyCastle',
  name: '天空城',
  description: '星読みの女王の居城。三つの星環がなければ、白い門は開かない。',
  background: 'skyCastle',
  baseLevel: 9,
  pools: CASTLE_POOLS,
  bossChest: 'legend',
  requiresKeys: ['ringWind', 'ringStar', 'ringMoon'],
  finale: true,
  layout: finaleLayout({ first: 'skyPeddler', story: 'starQueenThrone' }),
};

// ランダムダンジョン: 星屑の洞窟（部屋の並びを自動生成）
export const starDustCave: DungeonDef = {
  id: 'starDustCave',
  name: '星屑の洞窟',
  description: '訪れるたびに姿を変える星屑の洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'forestCave',
  baseLevel: 6,
  pools: CAVE_POOLS,
  bossChest: 'legend',
  random: true,
  // 段階7a: 全5行（4行＋ボスの行）
  rows: 4,
};
