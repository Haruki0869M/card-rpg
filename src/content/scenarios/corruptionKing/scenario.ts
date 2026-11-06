// シナリオ1「侵食の魔王」。このフォルダの敵・ダンジョン・イベントは、このシナリオだけで使われる
import type { ScenarioDef } from '../../../types';

export const corruptionKing: ScenarioDef = {
  id: 'corruptionKing',
  order: 1,
  name: '侵食の魔王',
  synopsis: '封印されていた侵食の魔王ヴァルグリムが目覚めた。3つの封印の鍵を集め、魔王を再び封じよ。',
  recommended: '1〜4人',
  playTime: '60〜90分',
  unlocked: true,
  start: { gold: 0, pouch: [{ itemId: 'potion', count: 2 }] },
};
