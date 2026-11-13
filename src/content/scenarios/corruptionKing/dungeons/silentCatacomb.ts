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
  // 並びの決まり（docs/review/2026-11-13-room-variety2.md）: 5〜7行目（敵が1体増える行〜休憩の前）は、どの道でも戦う部屋が2つ以上。
  // 2026-11-13 強敵の計画 柱3: 強敵を1回も通らない道を残した（5行目の戦闘 → 6行目の宝箱かイベント → 7行目の戦闘）。
  // 強敵は 5行目と7行目（前は5・6行目）。6行目の宝箱（レア）・古の石碑は、7行目から1つ上げた
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'event', eventId: 'trappedHall', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0, 1] },
    ],
    [
      { type: 'rest', next: [0] },
      { type: 'battle', next: [1, 2] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0, 1] },
      { type: 'event', eventId: 'mysticSpring', next: [0, 1] },
    ],
    [
      { type: 'elite', next: [0, 1] },
      { type: 'battle', next: [1, 2] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [1] },
      { type: 'event', eventId: 'ancientStele', next: [0, 1] },
    ],
    [
      { type: 'elite', next: [0] },
      { type: 'battle', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};
