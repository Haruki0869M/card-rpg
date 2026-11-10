// 最終ダンジョン: 魔王城。3つの封印の鍵で扉が開く。途中に門番（中ボス）、最奥に侵食の魔王ヴァルグリム
import type { DungeonDef } from '../../../../types';
import { CASTLE_POOLS } from './pools';

export const demonCastle: DungeonDef = {
  id: 'demonCastle',
  name: '魔王城',
  description: '侵食の魔王ヴァルグリムの居城。三つの封印の鍵がなければ扉は開かない。',
  background: 'castle',
  baseLevel: 9,
  pools: CASTLE_POOLS,
  bossChest: 'legend',
  requiresKeys: ['emerald', 'azure', 'crimson'],
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
      { type: 'event', eventId: 'wanderingMerchant', next: [1] },
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
      { type: 'elite', next: [0, 1] },
      { type: 'battle', next: [0, 1] },
    ],
    [
      { type: 'chest', chest: { rarity: 'legend', locked: false }, next: [0] },
      { type: 'event', eventId: 'mysticSpring', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};
