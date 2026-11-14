// シナリオ2のダンジョン。部屋の並び（layout）から、通路の地図は自動で作られる（第3段階）。
// ボスの手前に「物語の部屋」（event）を置き、ボスの正体や春を奪われた理由が分かるようにしている
import type { DungeonDef } from '../../../../types';
import { CASTLE_POOLS, CATHEDRAL_POOLS, CRYSTAL_POOLS, MINE_POOLS } from './pools';
// 2026-11-14 シナリオ2の作り直し（docs/tasks/scenario2-rework-plan.md §2-4）: 氷晶の洞・霜の巨人の鉱山・氷の城は、型の写しをやめて
// このシナリオだけの形をファイルに直接書いた（シナリオ1と同じ）。並びの決まりは src/engine/__tests__/dungeonShape.test.ts。
// 沈んだ聖堂は「砂時計」の形が決まり（5行目の戦う部屋）と両立しないので保留（2つ目の鍵の型のまま。まとめ役に報告）
import { keyLayout2 } from '../../../common/dungeonLayouts';

/** 氷晶の洞（入門。道中のイベントと鍵の戦いまで） */
export const crystalCave: DungeonDef = {
  id: 'crystalCave',
  name: '氷晶の洞',
  description: '白樺の雪林の奥にある氷の洞窟。氷柱を従える主が、氷晶の鍵（白）を守るという。',
  background: 'crystalCave',
  baseLevel: 4,
  pools: CRYSTAL_POOLS,
  bossChest: 'epic',
  rewardKey: 'crystalWhite',
  clearStory: ['氷晶の主が、音を立てて砕け散った。', '最期に「…温かい」とつぶやいた。', '氷晶の鍵（白）を手に入れた！'],
  // 形「2本の氷の橋」: 2行目で左右に分かれる。左の橋 = 強敵 → 鍵の宝箱か休憩 → 戦闘か強敵。右の橋 = 凍った吊り橋 → 戦闘 → 宝箱。
  // 橋が渡れるのは4行目の1か所だけ（右の橋の3行目の戦闘 → 左の橋の強敵）。5行目の広間（戦闘か強敵）で2本が合流する。
  // どの道でも、ふつうの戦闘は2回以上（ボスの前が「休憩 → 物語の部屋」の8行の鍵）。強敵を通らない道 = 右の橋 → 宝箱 → 戦闘
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'elite', next: [0, 1] },
      { type: 'event', eventId: 'frostBridge', next: [2] },
    ],
    [
      { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0, 1] },
      { type: 'rest', next: [0, 1] },
      { type: 'battle', next: [1, 2] },
    ],
    [
      { type: 'battle', next: [1] },
      { type: 'elite', next: [0] },
      { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0, 1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'elite', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'crystalGate', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

/** 沈んだ聖堂（亡者と祈り。やや戦闘が多い） */
export const sunkenCathedral: DungeonDef = {
  id: 'sunkenCathedral',
  name: '沈んだ聖堂',
  description: '凍った湖の底に沈む古い聖堂。凍れる司教が、氷晶の鍵（蒼）を抱いて祈り続けている。',
  background: 'sunkenCathedral',
  baseLevel: 6,
  pools: CATHEDRAL_POOLS,
  bossChest: 'epic',
  rewardKey: 'crystalBlue',
  // 1つ目のダンジョンの鍵が要る（play-feedback-plan §4 C: 町や依頼を飛ばして、まっすぐ奥へ行けないように）
  requiresKeys: ['crystalWhite'],
  clearStory: ['司教は微笑み、光になって消えた。', '「どうか、姫様を止めて」', '氷晶の鍵（蒼）を手に入れた！'],
  layout: keyLayout2({ first: 'iceSilhouette', second: 'frozenCamp', story: 'bishopAltar' }),
};

/** 霜の巨人の鉱山（分かれ道が多く、強敵が2回出る） */
export const giantMine: DungeonDef = {
  id: 'giantMine',
  name: '霜の巨人の鉱山',
  description: '吹雪の山脈に口を開ける古い鉱山。霜の巨人が、氷晶の鍵（銀）の眠る坑道をふさいでいる。',
  background: 'giantMine',
  baseLevel: 8,
  pools: MINE_POOLS,
  bossChest: 'legend',
  rewardKey: 'crystalSilver',
  // 2つ目の鍵と、町の依頼を1つ（報告まで）が要る（冒険を長くする。町に寄る理由を作る）
  requiresKeys: ['crystalBlue'],
  requiresQuests: 1,
  clearStory: ['霜の巨人が、ゆっくり膝をついた。', '「女王様を…あたためてやってくれ」', '氷晶の鍵（銀）を手に入れた！'],
  // 形「坑道の網」: 3部屋の行が多く、行き先が交差する。坑道の奥（7行目）に封魔の宝箱の部屋を1つ（戦闘・強敵と並ぶ）。
  // 強敵を2回通る道（2行目の強敵 → 4行目の強敵 など）と、1回も通らない道がある。どの道でも、ふつうの戦闘は3〜4回
  layout: [
    [{ type: 'battle', next: [0, 1, 2] }],
    [
      { type: 'event', eventId: 'furTrader', next: [0] },
      { type: 'elite', next: [1, 2] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0, 1] },
    ],
    [
      { type: 'battle', next: [1] },
      { type: 'rest', next: [0] },
      { type: 'event', eventId: 'buriedChest', next: [0] },
    ],
    [
      { type: 'battle', next: [0, 2] },
      { type: 'elite', next: [0, 1] },
    ],
    [
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0, 1] },
      { type: 'battle', next: [0, 2] },
      { type: 'rest', next: [0, 1] },
    ],
    [
      { type: 'elite', next: [0] },
      { type: 'battle', next: [1, 2] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0, 1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'elite', next: [0] },
      // 封魔の宝箱（決まった部屋。格はエンジンが奥の行で決める物と同じ: 10行目より前はエピック）
      { type: 'sealedChest', chest: { rarity: 'epic', locked: false, sealed: true }, next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'giantGate', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};

/** 氷の城（三つの鍵で開く最終ダンジョン） */
export const iceCastle: DungeonDef = {
  id: 'iceCastle',
  name: '氷の城',
  description: '白の女王の居城。三つの氷晶の鍵がなければ、凍りついた扉は開かない。',
  background: 'iceCastle',
  baseLevel: 10,
  pools: CASTLE_POOLS,
  bossChest: 'legend',
  requiresKeys: ['crystalWhite', 'crystalBlue', 'crystalSilver'],
  finale: true,
  // 形「左右の塔」: 2行目は入口の広間（3部屋。どこからでも西と東の塔へ）。3〜6行目は西の塔と東の塔に分かれ、7行目の中ボスで合流する。
  // 西の塔 = 強敵の翼（強敵2部屋・レジェンドの宝箱）。東の塔 = 休憩とイベントの翼（強敵なし）。
  // 1行にふつうの戦闘は1部屋だけなので、西は3・5行目、東は4・6行目が戦闘（どの道でも戦闘4回）。
  // 中ボスの後も2本（戦闘 → 強敵 / 鍵の宝箱 → 戦闘）に分かれ、玉座の前の休憩で1つになる
  layout: [
    [{ type: 'battle', next: [0, 1, 2] }],
    [
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0, 1] },
      { type: 'rest', next: [0, 2] },
      { type: 'event', eventId: 'iceSilhouette', next: [0, 1] },
    ],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'rest', next: [2] },
      { type: 'event', eventId: 'frozenCamp', next: [2] },
    ],
    [
      { type: 'elite', next: [0] },
      { type: 'chest', chest: { rarity: 'legend', locked: false }, next: [0] },
      { type: 'battle', next: [1, 2] },
    ],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'common', locked: false }, next: [2] },
      { type: 'rest', next: [2] },
    ],
    [
      { type: 'elite', next: [0] },
      { type: 'rest', next: [0] },
      { type: 'battle', next: [0] },
    ],
    [{ type: 'midboss', next: [0] }],
    [{ type: 'rest', next: [0, 1] }],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [1] },
    ],
    [
      { type: 'elite', next: [0] },
      { type: 'battle', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
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
  baseLevel: 7,
  pools: { ...CRYSTAL_POOLS, boss: ['frostDrakeling', 'snowWitch'] },
  bossChest: 'legend',
  random: true,
  // 段階7a: 全5行（4行＋ボスの行）
  rows: 4,
};
