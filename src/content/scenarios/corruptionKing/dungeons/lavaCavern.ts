// シナリオダンジョン: 溶岩の大空洞（灼熱の火山。封印の鍵（紅））
import type { DungeonDef } from '../../../../types';
import { VOLCANO_POOLS } from './pools';

export const lavaCavern: DungeonDef = {
  id: 'lavaCavern',
  name: '溶岩の大空洞',
  description: '火山の腹の中に広がる大空洞。炎竜が財宝を守って眠る。',
  background: 'volcano',
  baseLevel: 7,
  pools: VOLCANO_POOLS,
  bossChest: 'legend',
  rewardKey: 'crimson',
  corruptionOnClear: 5,
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'event', eventId: 'wanderingMerchant', next: [1, 2] },
    ],
    [
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
      { type: 'battle', next: [0, 1] },
      { type: 'rest', next: [1] },
    ],
    [
      { type: 'event', eventId: 'ancientStele', next: [0] },
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
