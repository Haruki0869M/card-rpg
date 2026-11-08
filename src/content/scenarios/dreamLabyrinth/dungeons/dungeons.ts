// シナリオ7のダンジョン。敵の組み合わせ（POOLS）は仮（敵ができたら置き換える）。
// 制覇すると夢の欠片が手に入り、3つそろうと最終ダンジョンに入れる。ボスは過去のボスの再来。手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';

const POOLS: DungeonDef['pools'] = {
  battle: [['guardDog', 'guardDog'], ['goblinScout', 'guardDog'], ['chaosShaman', 'goblinScout'], ['goblinScout', 'goblinScout', 'chaosShaman']],
  elite: [['goblinBrute'], ['goblinBrute', 'chaosShaman']],
  boss: ['goblinBrute'],
};

type Layout = NonNullable<DungeonDef['layout']>;

/** 氷の記憶の洞（8行。入門。終わらない階段と記憶の宝箱） */
const iceLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'event', eventId: 'dreamStairs', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0] },
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [1] },
  ],
  [
    { type: 'event', eventId: 'echoChest', next: [0] },
    { type: 'elite', next: [0, 1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'iceEchoHall', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 砂の幻影の墓（8行。壁画と泉。強敵が2回） */
const sandLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: 'fadedMural', next: [0, 1] },
    { type: 'battle', next: [1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
    { type: 'elite', next: [0, 1] },
    { type: 'event', eventId: 'lullabySpring', next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'sandEchoHall', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 幽霊船の悪夢（9行。悪夢の罠と夢の行商人。分かれ道が多い） */
const ghostLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'battle', next: [1, 2] },
  ],
  [
    { type: 'event', eventId: 'nightmareTrap', next: [0] },
    { type: 'battle', next: [0, 1] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [1] },
  ],
  [
    { type: 'elite', next: [0, 1] },
    { type: 'rest', next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'event', eventId: 'dreamPeddler', next: [0, 1] },
  ],
  [
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
    { type: 'elite', next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'ghostEchoHall', next: [0] }],
  [{ type: 'boss', next: [] }],
];

export const echoIceVault: DungeonDef = {
  id: 'echoIceVault',
  name: '氷の記憶の洞',
  description: '氷の城の記憶が残る洞。蘇った白の女王の影が、夢の欠片（記憶）を抱えている。',
  background: 'echoIceVault',
  baseLevel: 4,
  pools: POOLS,
  bossChest: 'epic',
  rewardKey: 'shardMemory',
  corruptionOnClear: 5,
  clearStory: ['白の女王の影が、雪のように溶けた。', '「…覚えていてくれて、ありがとう」', '夢の欠片（記憶）を手に入れた！'],
  layout: iceLayout,
};

export const echoSandTomb: DungeonDef = {
  id: 'echoSandTomb',
  name: '砂の幻影の墓',
  description: '砂漠の王朝の記憶が残る墓。蘇った砂塵の王の影が、夢の欠片（恐れ）を抱えている。',
  background: 'echoSandTomb',
  baseLevel: 6,
  pools: POOLS,
  bossChest: 'epic',
  rewardKey: 'shardFear',
  corruptionOnClear: 5,
  clearStory: ['砂塵の王の影が、金色の砂に崩れた。', '「永遠でなくても、よかったのだな」', '夢の欠片（恐れ）を手に入れた！'],
  layout: sandLayout,
};

export const echoGhostShip: DungeonDef = {
  id: 'echoGhostShip',
  name: '幽霊船の悪夢',
  description: '霧の海の記憶が残る幽霊船。蘇った亡霊提督の影が、夢の欠片（希望）を抱えている。',
  background: 'echoGhostShip',
  baseLevel: 8,
  pools: POOLS,
  bossChest: 'legend',
  rewardKey: 'shardHope',
  corruptionOnClear: 5,
  clearStory: ['亡霊提督の影が、静かに敬礼した。', '「今度こそ、朝日が見える」', '夢の欠片（希望）を手に入れた！'],
  layout: ghostLayout,
};

export const dreamEaterLair: DungeonDef = {
  id: 'dreamEaterLair',
  name: '夢喰いの巣',
  description: '夢喰いの住処。三つの夢の欠片がなければ、記憶の扉は開かない。',
  background: 'dreamEaterLair',
  baseLevel: 10,
  pools: POOLS,
  bossChest: 'legend',
  requiresKeys: ['shardMemory', 'shardFear', 'shardHope'],
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
    [{ type: 'event', eventId: 'dreamEaterNest', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

// ランダムダンジョン: 夢の洞窟（部屋の並びを自動生成）
export const dreamCave: DungeonDef = {
  id: 'dreamCave',
  name: '夢の洞窟',
  description: '訪れるたびに姿を変える夢の洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'forestCave',
  baseLevel: 7,
  pools: { ...POOLS, boss: ['goblinBrute', 'chaosShaman'] },
  bossChest: 'legend',
  random: true,
  rows: 6,
};
