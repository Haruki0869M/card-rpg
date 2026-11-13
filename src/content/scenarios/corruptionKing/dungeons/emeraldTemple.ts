// シナリオダンジョン: 翠の神殿（部屋の並びが固定）
import type { DungeonDef } from '../../../../types';
import { FOREST_POOLS } from './pools';

export const emeraldTemple: DungeonDef = {
  id: 'emeraldTemple',
  name: '翠の神殿',
  description: '森の奥に眠る古い神殿。封印の鍵（翠）を守る樹魔が棲むという。',
  background: 'temple',
  baseLevel: 3,
  pools: FOREST_POOLS,
  bossChest: 'epic',
  rewardKey: 'emerald',
  clearStory: ['樹魔トレントキングが倒れた。', '森に、さわやかな風が戻ってくる。', '封印の鍵（翠）を手に入れた！'],
  // 行ごとの部屋。next は次の行の何番目の部屋につながるか。
  // 並びの決まり（docs/review/2026-11-13-room-variety2.md）: 同じ種類が続かない・同じ行は全部ちがう種類・戦わない部屋は2つまで・
  // 5〜6行目（敵が1体増える行）は2つとも戦う部屋（ふつうの戦闘と強敵を交差させる）・どの道でもふつうの戦闘が3回
  layout: [
    [{ type: 'battle', next: [0, 1, 2] }],
    [
      { type: 'event', eventId: 'fallenTree', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0, 1] },
      { type: 'rest', next: [0, 1] },
    ],
    [
      { type: 'battle', next: [1, 2] },
      { type: 'elite', next: [0] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0, 1] },
      { type: 'event', eventId: 'ancientStele', next: [0, 1] },
    ],
    [
      { type: 'elite', next: [0] },
      { type: 'battle', next: [1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'elite', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};
