// シナリオ1「侵食の魔王」。このフォルダの敵・ダンジョン・イベントは、このシナリオだけで使われる
import type { ScenarioDef } from '../../../types';
import { corruptionKingMap } from './map';

export const corruptionKing: ScenarioDef = {
  id: 'corruptionKing',
  order: 1,
  name: '侵食の魔王',
  synopsis: '封印されていた侵食の魔王ヴァルグリムが目覚めた。3つの封印の鍵を集め、魔王を再び封じよ。',
  recommended: '1〜4人',
  playTime: '60〜90分',
  unlocked: true,
  start: { gold: 30, pouch: [{ itemId: 'potion', count: 2 }] },
  map: corruptionKingMap,
  story: {
    opening: [
      '大陸アルセリア。かつて七英雄が封じた「侵食の魔王ヴァルグリム」が、千年の眠りから目覚めた。',
      '魔王の瘴気は大地を蝕み、世界は少しずつ侵食されていく。',
      '王都の老賢者は告げた。「翠・蒼・紅、三つの封印の鍵を集め、魔王城の扉を開け。そして魔王を再び封じるのだ」',
      '侵食度が100%に達すれば、世界は終わる。旅立ちの時だ。',
    ],
    ending: [
      '魔王ヴァルグリムの体が光に包まれ、三つの鍵の力で再び封じられていく。',
      '空を覆っていた瘴気が晴れ、アルセリアに朝の光が戻った。',
      '王都では英雄たちの帰還を祝う鐘が、いつまでも鳴り響いていた。',
      '― 侵食の魔王 完 ―',
    ],
    keys: { emerald: '封印の鍵（翠）', azure: '封印の鍵（蒼）', crimson: '封印の鍵（紅）' },
  },
};
