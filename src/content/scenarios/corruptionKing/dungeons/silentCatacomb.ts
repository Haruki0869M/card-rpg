// シナリオダンジョン: 沈黙の地下墓所（嘆きの沼。封印の鍵（蒼））
import type { DungeonDef } from '../../../../types';
import { SWAMP_POOLS } from './pools';

export const silentCatacomb: DungeonDef = {
  id: 'silentCatacomb',
  name: '沈黙の地下墓所',
  description: '沼の底に沈んだ古い墓所。屍術師が亡者を操っているという。',
  background: 'catacomb',
  mapBackground: 'catacombMap',
  baseLevel: 5,
  pools: SWAMP_POOLS,
  bossChest: 'epic',
  rewardKey: 'azure',
  // 1つ目のダンジョンの鍵が要る（play-feedback-plan §4 C: 町や依頼を飛ばして、まっすぐ奥へ行けないように）
  requiresKeys: ['emerald'],
  clearStory: ['屍術師モルデアは、静かに崩れ落ちた。', '亡者たちが、ようやく眠りについた。', '封印の鍵（蒼）を手に入れた！'],
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'event', eventId: 'trappedHall', next: [0, 1] },
      { type: 'battle', next: [1] },
    ],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'rest', next: [1, 2] },
    ],
    [
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
      { type: 'elite', next: [0, 1] },
      { type: 'event', eventId: 'mysticSpring', next: [1] },
    ],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [1] },
    ],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'elite', next: [0, 1] },
    ],
    [
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
      { type: 'event', eventId: 'ancientStele', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};
