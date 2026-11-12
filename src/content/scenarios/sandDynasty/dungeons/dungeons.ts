// シナリオ4のダンジョン。敵の組み合わせは砂塵の王朝の専用の敵（enemies/）。
// 制覇すると聖印が手に入り、3つそろうと最終ダンジョンに入れる。ボスの手前に「物語の部屋」（event）を置く
import type { DungeonDef } from '../../../../types';

/** 蠍の墓所: 廃墟の敵と王家の衛兵ミイラ */
const TOMB_POOLS: DungeonDef['pools'] = {
  battle: [['desertFennec', 'jackalWarrior'], ['sandScorpion', 'tombRobber'], ['jackalWarrior', 'sandScorpion'], ['desertViper', 'tombRobber'], ['jackalWarrior', 'tombRobber']],
  elite: [['royalGuardMummy'], ['royalGuardMummy', 'desertViper']],
  boss: ['sandScorpionKing'],
};

/** 影の書庫: 砂丘の敵と書記官の影 */
const LIBRARY_POOLS: DungeonDef['pools'] = {
  battle: [['vulture', 'mummy'], ['sandSprite', 'mummy'], ['emberSandScorpion', 'mummy'], ['dustDevil', 'sandSprite', 'vulture']],
  elite: [['scribeShade', 'dustDevil'], ['cursedScribeShade', 'vulture']],
  boss: ['shadowVizier'],
};

/** 石像の神殿: 谷の敵と、スフィンクスの子・砂の大蛇 */
const TEMPLE_POOLS: DungeonDef['pools'] = {
  battle: [['obeliskSentinel', 'cursedPriest'], ['sandWorm', 'cursedPriest'], ['clayGolem', 'mummyArcher'], ['cursedMummy', 'stormVulture'], ['sandWorm', 'mummyArcher']],
  elite: [['sphinxCub'], ['sandSerpentLord'], ['sphinxCub', 'clayGolem'], ['sandSerpentLord', 'cursedPriest']],
  boss: ['stoneGuardianBeast'],
};

/** 砂塵の王宮: 王宮前の敵（石の猫像など）と石像の巨兵 */
const PALACE_POOLS: DungeonDef['pools'] = {
  battle: [['stoneCat', 'cursedPriest'], ['stoneCat', 'mummyArcher'], ['venomMummyArcher', 'cursedPriest'], ['venomJackalWarrior', 'mummyArcher'], ['cursedMummy', 'clayGolem']],
  elite: [['colossusStatue'], ['colossusStatue', 'cursedPriest']],
  // 7行目の中ボス（提案）
  midboss: ['colossusStatue', 'stoneCat'],
  boss: ['sandPharaoh'],
};

/** 砂の洞窟（ランダム）: 砂丘と谷の敵 */
const CAVE_POOLS: DungeonDef['pools'] = {
  battle: [['mummy', 'dustDevil'], ['sandWorm', 'vulture'], ['emberSandScorpion', 'mummyArcher'], ['clayGolem', 'sandSprite']],
  elite: [['sandSerpentLord'], ['royalGuardMummy', 'sandSprite']],
  boss: ['sandSerpentLord', 'sphinxCub'],
};

type Layout = NonNullable<DungeonDef['layout']>;

/** 蠍の墓所（入門。砂の崩落と墓の罠） */
const scorpionTombLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'event', eventId: 'sandCollapse', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0, 1] },
    { type: 'elite', next: [0, 1] },
    { type: 'rest', next: [0] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'event', eventId: 'tombTrap', next: [0] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'scorpionNest', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 影の書庫（壁画と泉。強敵が2回） */
const shadowLibraryLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'event', eventId: 'hieroglyphWall', next: [0, 1] },
    { type: 'battle', next: [1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'rest', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
    { type: 'elite', next: [0, 1] },
    { type: 'event', eventId: 'undergroundSpring', next: [1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'elite', next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'scribeDesk', next: [0] }],
  [{ type: 'boss', next: [] }],
];

/** 石像の神殿（分かれ道が多く、幽霊の隊商がいる） */
const statueTempleLayout: Layout = [
  [{ type: 'battle', next: [0, 1] }],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'event', eventId: 'rubbleChest', next: [1, 2] },
  ],
  [
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
    { type: 'elite', next: [0, 1] },
    { type: 'battle', next: [1] },
  ],
  [
    { type: 'rest', next: [0, 1] },
    { type: 'event', eventId: 'ghostCaravan', next: [1] },
  ],
  [
    { type: 'battle', next: [0, 1] },
    { type: 'battle', next: [1] },
  ],
  [
    { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
    { type: 'elite', next: [0, 1] },
  ],
  [
    { type: 'battle', next: [0] },
    { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
  ],
  [{ type: 'rest', next: [0] }],
  [{ type: 'event', eventId: 'guardianGate', next: [0] }],
  [{ type: 'boss', next: [] }],
];

export const scorpionTomb: DungeonDef = {
  id: 'scorpionTomb',
  name: '蠍の墓所',
  description: '砂に埋もれた古い墓所。砂蠍王が、聖印（甲虫）を守っているという。',
  background: 'scorpionTomb',
  baseLevel: 4,
  pools: TOMB_POOLS,
  bossChest: 'epic',
  rewardKey: 'sealScarab',
  clearStory: ['砂蠍王が、砂になって崩れた。', '墓所に、風が通り抜ける。', '聖印（甲虫）を手に入れた！'],
  layout: scorpionTombLayout,
};

export const shadowLibrary: DungeonDef = {
  id: 'shadowLibrary',
  name: '影の書庫',
  description: '王朝の記録が眠る地下の書庫。影の宰相が、聖印（眼）を守っている。',
  background: 'shadowLibrary',
  baseLevel: 6,
  pools: LIBRARY_POOLS,
  bossChest: 'epic',
  rewardKey: 'sealEye',
  // 1つ目のダンジョンの鍵が要る（play-feedback-plan §4 C: 町や依頼を飛ばして、まっすぐ奥へ行けないように）
  requiresKeys: ['sealScarab'],
  clearStory: ['影の宰相は、書を閉じて消えた。', '「王を、救ってくれ」', '聖印（眼）を手に入れた！'],
  layout: shadowLibraryLayout,
};

export const statueTemple: DungeonDef = {
  id: 'statueTemple',
  name: '石像の神殿',
  description: '王家の谷の奥にある神殿。石の守護獣が、聖印（獣）を抱いて眠っている。',
  background: 'statueTemple',
  baseLevel: 8,
  pools: TEMPLE_POOLS,
  bossChest: 'legend',
  rewardKey: 'sealBeast',
  // 2つ目の鍵と、町の依頼を1つ（報告まで）が要る（冒険を長くする。町に寄る理由を作る）
  requiresKeys: ['sealEye'],
  requiresQuests: 1,
  clearStory: ['守護獣の石の体に、ひびが走った。', '「王を…頼む」', '聖印（獣）を手に入れた！'],
  layout: statueTempleLayout,
};

export const sandPalace: DungeonDef = {
  id: 'sandPalace',
  name: '砂塵の王宮',
  description: '砂塵の王の居城。三つの聖印がなければ、黄金の扉は開かない。',
  background: 'sandPalace',
  baseLevel: 10,
  pools: PALACE_POOLS,
  bossChest: 'legend',
  requiresKeys: ['sealScarab', 'sealEye', 'sealBeast'],
  finale: true,
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0, 1] },
    ],
    [
      { type: 'elite', next: [0, 1] },
      { type: 'battle', next: [1] },
    ],
    [
      { type: 'rest', next: [0, 1] },
      { type: 'event', eventId: 'ghostCaravan', next: [1] },
    ],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'elite', next: [1] },
    ],
    [
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
      { type: 'battle', next: [0] },
    ],
    [{ type: 'midboss', next: [0] }],
    [{ type: 'rest', next: [0, 1] }],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [1] },
    ],
    [
      { type: 'elite', next: [0] },
      { type: 'battle', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'pharaohThrone', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

// ランダムダンジョン: 砂の洞窟（部屋の並びを自動生成）
export const sandCave: DungeonDef = {
  id: 'sandCave',
  name: '砂の洞窟',
  description: '訪れるたびに姿を変える砂の洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'forestCave',
  baseLevel: 7,
  pools: CAVE_POOLS,
  bossChest: 'legend',
  random: true,
  // 段階7a: 全5行（4行＋ボスの行）
  rows: 4,
};
