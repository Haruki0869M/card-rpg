// シナリオ5のダンジョン。
// 敵の組み合わせはダンジョンごと（enemies/ の専用の敵）。
// 制覇すると星環が手に入り、3つそろうと最終ダンジョンに入れる。ボスの手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';

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
  boss: ['starSeerQueen'],
};

const CAVE_POOLS: DungeonDef['pools'] = {
  battle: [['moonRabbit', 'gearBeetle'], ['moonWolf', 'starFragment'], ['shootingStarBird', 'thornFairy'], ['starJelly', 'moonRabbit', 'starFragment'], ['angelStatue', 'hourglassGolem']],
  elite: [['starDustScribe'], ['moonGardener']],
  boss: ['clockworkKnight', 'moonGardener'],
};

type Layout = NonNullable<DungeonDef['layout']>;

/** 風車の塔（8行。入門。突風と星屑の箱） */
const windmillLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'event', eventId: 'skyWindGap', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0] },
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [1] },
  ],
  [
    { type: 'event', eventId: 'starDustChest', next: [0] },
    { type: 'elite', next: [0, 1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'windKeeperHall', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 星見の天文台（8行。壁画と時計仕掛けの罠。強敵が2回） */
const observatoryLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: 'constellationMural', next: [0, 1] },
    { type: 'battle', next: [1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
    { type: 'elite', next: [0, 1] },
    { type: 'event', eventId: 'clockworkTrap', next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'librarianDesk', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 月光の庭（9行。泉と飛行船の行商人。分かれ道が多い） */
const moonGardenLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'battle', next: [1, 2] },
  ],
  [
    { type: 'event', eventId: 'moonPetalFountain', next: [0] },
    { type: 'battle', next: [0, 1] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [1] },
  ],
  [
    { type: 'elite', next: [0, 1] },
    { type: 'rest', next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'event', eventId: 'skyPeddler', next: [0, 1] },
  ],
  [
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
    { type: 'elite', next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'moonMaidenGarden', next: [0] }],
  [{ type: 'boss', next: [] }],
];

export const windmillTower: DungeonDef = {
  id: 'windmillTower',
  name: '風車の塔',
  description: '風の回廊の先にそびえる、巨大な風車の塔。風の番人が、星環（風）を守っている。',
  background: 'temple',
  baseLevel: 3,
  pools: WINDMILL_POOLS,
  bossChest: 'epic',
  rewardKey: 'ringWind',
  corruptionOnClear: 5,
  clearStory: ['風の番人が、風になって消えた。', '塔の風車が、静かに回りだす。', '星環（風）を手に入れた！'],
  layout: windmillLayout,
};

export const observatory: DungeonDef = {
  id: 'observatory',
  name: '星見の天文台',
  description: '星の記録が眠る古い天文台。星の司書が、星環（星）を守っている。',
  background: 'catacomb',
  baseLevel: 5,
  pools: OBSERVATORY_POOLS,
  bossChest: 'epic',
  rewardKey: 'ringStar',
  corruptionOnClear: 5,
  clearStory: ['星の司書は、本を閉じて微笑んだ。', '「女王様を…お願いします」', '星環（星）を手に入れた！'],
  layout: observatoryLayout,
};

export const moonlitGarden: DungeonDef = {
  id: 'moonlitGarden',
  name: '月光の庭',
  description: '月の光が降りそそぐ、天空城の庭園。月の乙女が、星環（月）を抱いて眠っている。',
  background: 'forestCave',
  baseLevel: 7,
  pools: GARDEN_POOLS,
  bossChest: 'legend',
  rewardKey: 'ringMoon',
  corruptionOnClear: 5,
  clearStory: ['月の乙女が、花びらになって舞った。', '「ありがとう。女王様を、どうか」', '星環（月）を手に入れた！'],
  layout: moonGardenLayout,
};

export const skyCastle: DungeonDef = {
  id: 'skyCastle',
  name: '天空城',
  description: '星読みの女王の居城。三つの星環がなければ、白い門は開かない。',
  background: 'castle',
  baseLevel: 9,
  pools: CASTLE_POOLS,
  bossChest: 'legend',
  requiresKeys: ['ringWind', 'ringStar', 'ringMoon'],
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
    [{ type: 'event', eventId: 'starQueenThrone', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
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
  rows: 6,
};
