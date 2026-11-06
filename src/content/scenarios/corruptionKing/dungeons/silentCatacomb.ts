// シナリオダンジョン: 沈黙の地下墓所（嘆きの沼。封印の鍵（蒼））
import type { DungeonDef } from '../../../../types';
import { SWAMP_POOLS } from './pools';

export const silentCatacomb: DungeonDef = {
  id: 'silentCatacomb',
  name: '沈黙の地下墓所',
  description: '沼の底に沈んだ古い墓所。屍術師が亡者を操っているという。',
  background: 'swamp',
  baseLevel: 5,
  pools: SWAMP_POOLS,
  bossChest: 'epic',
  rewardKey: 'azure',
  corruptionOnClear: 5,
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'event', eventId: 'trappedHall', next: [1, 2] },
    ],
    [
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
      { type: 'battle', next: [0, 1] },
      { type: 'rest', next: [1] },
    ],
    [
      { type: 'event', eventId: 'mysticSpring', next: [0] },
      { type: 'elite', next: [0, 1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};
