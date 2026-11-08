// シナリオ3のダンジョン。敵の組み合わせ（POOLS）は仮（手順2で作り込む）。
// 制覇すると鍵（灯）が手に入り、3つそろうと最終ダンジョンに入れる。ボスの手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';

const POOLS: DungeonDef['pools'] = {
  battle: [['guardDog', 'guardDog'], ['goblinScout', 'guardDog'], ['chaosShaman', 'goblinScout'], ['goblinScout', 'goblinScout', 'chaosShaman']],
  elite: [['goblinBrute'], ['goblinBrute', 'chaosShaman']],
  boss: ['goblinBrute'],
};

type Layout = NonNullable<DungeonDef['layout']>;

/** 難破船の洞窟（8行。入門。潮と沈んだ宝箱） */
const wreckCaveLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'event', eventId: 'seaCaveTide', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0] },
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [1] },
  ],
  [
    { type: 'event', eventId: 'sunkenChest', next: [0] },
    { type: 'elite', next: [0, 1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'serpentNest', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 海賊の隠れ島（8行。海賊の財宝と罠。強敵が2回） */
const pirateIslandLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: 'pirateStash', next: [0, 1] },
    { type: 'battle', next: [1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
    { type: 'elite', next: [0, 1] },
    { type: 'event', eventId: 'castawayCamp', next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'captainCabin', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 沈んだ神殿（9行。霧の歌と潮の祭壇。分かれ道が多い） */
const sunkenTempleLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'battle', next: [1, 2] },
  ],
  [
    { type: 'event', eventId: 'ghostSong', next: [0] },
    { type: 'battle', next: [0, 1] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [1] },
  ],
  [
    { type: 'elite', next: [0, 1] },
    { type: 'rest', next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'event', eventId: 'seaTrader', next: [0, 1] },
  ],
  [
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
    { type: 'elite', next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'tideAltar', next: [0] }],
  [{ type: 'boss', next: [] }],
];

export const wreckCave: DungeonDef = {
  id: 'wreckCave',
  name: '難破船の洞窟',
  description: '珊瑚の浅瀬の岩場に口を開ける洞窟。海蛇の女王が、星の灯の鍵を守るという。',
  background: 'catacomb',
  baseLevel: 3,
  pools: POOLS,
  bossChest: 'epic',
  rewardKey: 'lightStar',
  corruptionOnClear: 5,
  clearStory: ['海蛇の女王が、静かに海へ沈んでいった。', '洞窟に、星の灯がともった。', '星の灯を手に入れた！'],
  layout: wreckCaveLayout,
};

export const pirateIsland: DungeonDef = {
  id: 'pirateIsland',
  name: '海賊の隠れ島',
  description: '霧の海に浮かぶ、海賊たちの隠れ家。死んでなお略奪を続ける船長が、月の灯の鍵を持っている。',
  background: 'forestCave',
  baseLevel: 5,
  pools: POOLS,
  bossChest: 'epic',
  rewardKey: 'lightMoon',
  corruptionOnClear: 5,
  clearStory: ['海賊船長ガルドが、剣を落とした。', '「…灯台を、頼む」', '月の灯を手に入れた！'],
  layout: pirateIslandLayout,
};

export const sunkenTemple: DungeonDef = {
  id: 'sunkenTemple',
  name: '沈んだ神殿',
  description: '潮の満ち引きで、半分だけ姿を現す古い神殿。潮の神官が、日の灯の鍵を抱いて祈っている。',
  background: 'temple',
  baseLevel: 7,
  pools: POOLS,
  bossChest: 'legend',
  rewardKey: 'lightSun',
  corruptionOnClear: 5,
  clearStory: ['潮の神官が、祈りを止めて微笑んだ。', '「提督は、悲しんでおられる」', '日の灯を手に入れた！'],
  layout: sunkenTempleLayout,
};

export const ghostFlagship: DungeonDef = {
  id: 'ghostFlagship',
  name: '嘆きの王冠号',
  description: '幽霊船団の旗艦。三つの灯がそろわなければ、霧に隠れて姿を現さない。',
  background: 'castle',
  baseLevel: 9,
  pools: POOLS,
  bossChest: 'legend',
  requiresKeys: ['lightStar', 'lightMoon', 'lightSun'],
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
    [{ type: 'event', eventId: 'admiralBridge', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

// ランダムダンジョン: 潮騒の洞窟（部屋の並びを自動生成）
export const tideCave: DungeonDef = {
  id: 'tideCave',
  name: '潮騒の洞窟',
  description: '訪れるたびに姿を変える海の洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'forestCave',
  baseLevel: 6,
  pools: { ...POOLS, boss: ['goblinBrute', 'chaosShaman'] },
  bossChest: 'legend',
  random: true,
  rows: 6,
};
