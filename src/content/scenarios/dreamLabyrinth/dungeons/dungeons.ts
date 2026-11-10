// シナリオ7のダンジョン。敵はこのシナリオの敵（enemies/。夢の再来と新しい夢の敵）。弱点が同じ敵だけの組にしない。
// 制覇すると夢の欠片が手に入り、3つそろうと最終ダンジョンに入れる。ボスは過去のボスの再来。手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';
import { FINALE_EXTRA_FLOOR, KEY_EXTRA_FLOOR, grownLayout } from '../../extraFloor';

/** 氷の記憶の洞: 森と氷の記憶の敵。ボスは夢の白の女王 */
const ICE_POOLS: DungeonDef['pools'] = {
  battle: [['echoFrostWolf', 'pillowGolem'], ['echoIceSwordsman', 'sleepwalker'], ['echoForestWolf', 'lullabyBird'], ['echoBogGhoul', 'echoFrostWolf'], ['nightmareMote', 'echoIceSwordsman', 'sleepwalker']],
  elite: [['echoIceKnight'], ['echoIceKnight', 'nightmareMote']],
  boss: ['echoWhiteQueen'],
};

/** 砂の幻影の墓: 砂と機械の記憶の敵。ボスは夢の砂塵の王 */
const SAND_POOLS: DungeonDef['pools'] = {
  battle: [['echoMummy', 'shadowChild'], ['echoSandScorpion', 'echoWrenchGolem'], ['echoConveyorBot', 'pillowGolem'], ['echoMummy', 'echoConveyorBot'], ['shadowChild', 'echoSandScorpion', 'lullabyBird']],
  elite: [['echoColossusStatue'], ['mirrorKnight']],
  boss: ['echoSandPharaoh'],
};

/** 幽霊船の悪夢: 空と海の記憶の敵。ボスは夢の亡霊提督 */
const GHOST_POOLS: DungeonDef['pools'] = {
  battle: [['echoShark', 'echoAngelStatue'], ['echoDrownedSailor', 'lostMemory'], ['echoMoonRabbit', 'echoDrownedSailor'], ['lostMemory', 'echoShark']],
  elite: [['echoSeaWitch'], ['dreamWeaver']],
  boss: ['echoGhostAdmiral'],
};

/** 夢喰いの巣: 夢の敵の総力戦。ボスは夢喰い（3段階） */
const LAIR_POOLS: DungeonDef['pools'] = {
  battle: [['shadowChild', 'nightmareMote'], ['echoAngelStatue', 'echoMummy'], ['pillowGolem', 'lullabyBird'], ['echoWrenchGolem', 'lostMemory'], ['echoMoonRabbit', 'echoDrownedSailor']],
  elite: [['memoryEater'], ['dreamWeaver']],
  boss: ['dreamEater'],
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
  pools: ICE_POOLS,
  bossChest: 'epic',
  rewardKey: 'shardMemory',
  clearStory: ['白の女王の影が、雪のように溶けた。', '「…覚えていてくれて、ありがとう」', '夢の欠片（記憶）を手に入れた！'],
  layout: grownLayout(iceLayout, KEY_EXTRA_FLOOR),
};

export const echoSandTomb: DungeonDef = {
  id: 'echoSandTomb',
  name: '砂の幻影の墓',
  description: '砂漠の王朝の記憶が残る墓。蘇った砂塵の王の影が、夢の欠片（恐れ）を抱えている。',
  background: 'echoSandTomb',
  baseLevel: 6,
  pools: SAND_POOLS,
  bossChest: 'epic',
  rewardKey: 'shardFear',
  // 1つ目のダンジョンの鍵が要る（play-feedback-plan §4 C: 町や依頼を飛ばして、まっすぐ奥へ行けないように）
  requiresKeys: ['shardMemory'],
  clearStory: ['砂塵の王の影が、金色の砂に崩れた。', '「永遠でなくても、よかったのだな」', '夢の欠片（恐れ）を手に入れた！'],
  layout: grownLayout(sandLayout, KEY_EXTRA_FLOOR),
};

export const echoGhostShip: DungeonDef = {
  id: 'echoGhostShip',
  name: '幽霊船の悪夢',
  description: '霧の海の記憶が残る幽霊船。蘇った亡霊提督の影が、夢の欠片（希望）を抱えている。',
  background: 'echoGhostShip',
  baseLevel: 7,
  pools: GHOST_POOLS,
  bossChest: 'legend',
  rewardKey: 'shardHope',
  // 2つ目の鍵と、町の依頼を1つ（報告まで）が要る（冒険を長くする。町に寄る理由を作る）
  requiresKeys: ['shardFear'],
  requiresQuests: 1,
  clearStory: ['亡霊提督の影が、静かに敬礼した。', '「今度こそ、朝日が見える」', '夢の欠片（希望）を手に入れた！'],
  layout: grownLayout(ghostLayout, KEY_EXTRA_FLOOR),
};

export const dreamEaterLair: DungeonDef = {
  id: 'dreamEaterLair',
  name: '夢喰いの巣',
  description: '夢喰いの住処。三つの夢の欠片がなければ、記憶の扉は開かない。',
  background: 'dreamEaterLair',
  baseLevel: 9,
  pools: LAIR_POOLS,
  bossChest: 'legend',
  requiresKeys: ['shardMemory', 'shardFear', 'shardHope'],
  finale: true,
  layout: grownLayout([
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
  ], FINALE_EXTRA_FLOOR),
};

// ランダムダンジョン: 夢の洞窟（部屋の並びを自動生成）
export const dreamCave: DungeonDef = {
  id: 'dreamCave',
  name: '夢の洞窟',
  description: '訪れるたびに姿を変える夢の洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'forestCave',
  baseLevel: 7,
  pools: { ...LAIR_POOLS, boss: ['mirrorKnight', 'memoryEater'] },
  bossChest: 'legend',
  random: true,
  rows: 6,
};
