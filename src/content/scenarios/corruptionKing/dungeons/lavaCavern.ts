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
  // 2つ目の鍵と、町の依頼を1つ（報告まで）が要る（冒険を長くする。町に寄る理由を作る）
  requiresKeys: ['azure'],
  requiresQuests: 1,
  clearStory: ['炎竜イグナヴァルが地に伏した。', '溶岩の流れが、少しずつ静まっていく。', '封印の鍵（紅）を手に入れた！'],
  layout: [
    [{ type: 'battle', next: [0, 1] }],
    [
      { type: 'event', eventId: 'wanderingMerchant', next: [0, 1] },
      { type: 'rest', next: [1, 2] },
    ],
    [
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0] },
      { type: 'elite', next: [0, 1] },
      { type: 'battle', next: [1] },
    ],
    [
      { type: 'battle', next: [0, 1] },
      { type: 'event', eventId: 'ancientStele', next: [1] },
    ],
    [
      { type: 'event', eventId: 'fallenTree', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'common', locked: false }, next: [1] },
    ],
    [
      { type: 'chest', chest: { rarity: 'epic', locked: true }, next: [0] },
      { type: 'battle', next: [0, 1] },
    ],
    [
      { type: 'elite', next: [0, 1] },
      { type: 'chest', chest: { rarity: 'rare', locked: false }, next: [0, 1] },
    ],
    [
      { type: 'battle', next: [0] },
      { type: 'event', eventId: 'trappedHall', next: [0] },
    ],
    [{ type: 'rest', next: [0] }],
    [{ type: 'boss', next: [] }],
  ],
};
