// シナリオ2のダンジョン。部屋の並び（layout）から、通路の地図は自動で作られる（第3段階）。
// ボスの手前に「物語の部屋」（event）を置き、ボスの正体や春を奪われた理由が分かるようにしている
import type { DungeonDef } from '../../../../types';
import { CASTLE_POOLS, CATHEDRAL_POOLS, CRYSTAL_POOLS, MINE_POOLS } from './pools';

/** 氷晶の洞（8行。入門。道中のイベントと鍵の戦いまで） */
export const crystalCave: DungeonDef = {
  id: 'crystalCave',
  name: '氷晶の洞',
  description: '白樺の雪林の奥にある氷の洞窟。氷柱を従える主が、氷晶の鍵（白）を守るという。',
  background: 'catacomb',
  baseLevel: 3,
  pools: CRYSTAL_POOLS,
  bossChest: 'epic',
  rewardKey: 'crystalWhite',
  corruptionOnClear: 5,
  clearStory: ['氷晶の主が、音を立てて砕け散った。', '最期に「…温かい」とつぶやいた。', '氷晶の鍵（白）を手に入れた！'],
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'event', eventId: 'frostBridge', next: [1, 2] },
    ],
    [
      { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0] },
      { type: 'battle', next: [0, 1] },
      { type: 'rest', next: [1] },
    ],
    [
      { type: 'event', eventId: 'buriedChest', next: [0] },
      { type: 'elite', next: [0, 1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'crystalGate', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

/** 沈んだ聖堂（8行。亡者と祈り。やや戦闘が多い） */
export const sunkenCathedral: DungeonDef = {
  id: 'sunkenCathedral',
  name: '沈んだ聖堂',
  description: '凍った湖の底に沈む古い聖堂。凍れる司教が、氷晶の鍵（蒼）を抱いて祈り続けている。',
  background: 'temple',
  baseLevel: 5,
  pools: CATHEDRAL_POOLS,
  bossChest: 'epic',
  rewardKey: 'crystalBlue',
  corruptionOnClear: 5,
  clearStory: ['司教は微笑み、光になって消えた。', '「どうか、姫様を止めて」', '氷晶の鍵（蒼）を手に入れた！'],
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'event', eventId: 'iceSilhouette', next: [0, 1] },
      { type: 'battle', next: [1] },
    ],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'rest', next: [1, 2] },
    ],
    [
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
      { type: 'elite', next: [0, 1] },
      { type: 'event', eventId: 'frozenCamp', next: [1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'bishopAltar', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

/** 霜の巨人の鉱山（9行。分かれ道が多く、強敵が2回出る） */
export const giantMine: DungeonDef = {
  id: 'giantMine',
  name: '霜の巨人の鉱山',
  description: '吹雪の山脈に口を開ける古い鉱山。霜の巨人が、氷晶の鍵（銀）の眠る坑道をふさいでいる。',
  background: 'volcano',
  baseLevel: 7,
  pools: MINE_POOLS,
  bossChest: 'legend',
  rewardKey: 'crystalSilver',
  corruptionOnClear: 5,
  clearStory: ['霜の巨人が、ゆっくり膝をついた。', '「女王様を…あたためてやってくれ」', '氷晶の鍵（銀）を手に入れた！'],
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'battle', next: [1, 2] },
    ],
    [
      { type: 'event', eventId: 'buriedChest', next: [0] },
      { type: 'battle', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [1] },
    ],
    [
      { type: 'elite', next: [0, 1] },
      { type: 'rest', next: [1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'event', eventId: 'furTrader', next: [0, 1] },
    ],
    [
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
      { type: 'elite', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'giantGate', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

/** 氷の城（10行。三つの鍵で開く最終ダンジョン） */
export const iceCastle: DungeonDef = {
  id: 'iceCastle',
  name: '氷の城',
  description: '白の女王の居城。三つの氷晶の鍵がなければ、凍りついた扉は開かない。',
  background: 'castle',
  baseLevel: 9,
  pools: CASTLE_POOLS,
  bossChest: 'legend',
  requiresKeys: ['crystalWhite', 'crystalBlue', 'crystalSilver'],
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
    [{ type: 'elite', next: [0, 1] }],
    [
      { type: 'battle', next: [0] },
      { type: 'event', eventId: 'iceSilhouette', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'battle', next: [0] }],
    [{ type: 'event', eventId: 'queenThrone', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

// ランダムダンジョン: 凍る洞窟（部屋の並びを自動生成）
export const frozenCave: DungeonDef = {
  id: 'frozenCave',
  name: '凍る洞窟',
  description: '訪れるたびに姿を変える氷の洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'forestCave',
  baseLevel: 6,
  pools: { ...CRYSTAL_POOLS, boss: ['goblinBrute', 'chaosShaman'] },
  bossChest: 'legend',
  random: true,
  rows: 6,
};
