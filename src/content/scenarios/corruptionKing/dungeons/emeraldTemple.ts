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
  // 5行目（敵が1体増える行）は戦う部屋だけ。
  // 2026-11-13（強敵の計画 柱3・オーナーが選んだ案イ）: 休憩を1行前に出して「休憩 → 古い石碑 → ボス」にした（1つ目の鍵の型と同じ形）。
  // 強敵を1回も通らない道がある（戦闘 → 何か → 戦闘 → 宝箱（レア） → 戦闘）。休憩の後に戦う部屋が無いので、1つ目の鍵の型と同じく
  // どの道でもふつうの戦闘は2回以上（3回にするには3行目と5行目をふつうの戦闘だけにするしかなく、部屋がかなり減る）。
  // 強敵の後は、ふつうの戦闘に行く（強敵 → 宝箱 → 強敵 で、ふつうの戦闘が1回にならないように）
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
      { type: 'battle', next: [1] },
      { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0, 1] },
      { type: 'elite', next: [0] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'elite', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'event', eventId: 'ancientStele', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};
