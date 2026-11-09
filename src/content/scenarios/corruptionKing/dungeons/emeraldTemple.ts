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
  // 行ごとの部屋。next は次の行の何番目の部屋につながるか
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'event', eventId: 'fallenTree', next: [1, 2] },
    ],
    [
      { type: 'chest', chest: { rarity: 'common', locked: false }, next: [0] },
      { type: 'battle', next: [0, 1] },
      { type: 'rest', next: [1] },
    ],
    [
      { type: 'event', eventId: 'ancientStele', next: [0] },
      { type: 'elite', next: [0, 1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'rare', locked: true }, next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};
