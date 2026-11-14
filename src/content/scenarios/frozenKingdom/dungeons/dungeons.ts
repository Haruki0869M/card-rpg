// シナリオ2のダンジョン。部屋の並び（layout）から、通路の地図は自動で作られる（第3段階）。
// ボスの手前に「物語の部屋」（event）を置き、ボスの正体や春を奪われた理由が分かるようにしている
import type { DungeonDef } from '../../../../types';
import { CASTLE_POOLS, CATHEDRAL_POOLS, CRYSTAL_POOLS, MINE_POOLS } from './pools';
// 部屋の並びは4つの型（src/content/common/dungeonLayouts.ts）を、このダンジョンのイベントで埋めた物
import { finaleLayout, keyLayout1, keyLayout2, keyLayout3 } from '../../../common/dungeonLayouts';

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
  layout: keyLayout1({ first: 'frostBridge', second: 'buriedChest', story: 'crystalGate' }),
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
  layout: keyLayout3({ first: 'buriedChest', second: 'furTrader', story: 'giantGate' }),
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
  layout: finaleLayout({ first: 'iceSilhouette', story: 'queenThrone' }),
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
