// ===== 1台を回して遊ぶ時の、手番の受け渡し（フェーズ2-C） =====
// 世界マップの画面が出たまま担当の人が変わる時は、世界マップの「スマホを渡して、タップで始める」の画面
// （WorldScreen の HandoffOverlay。カットインと同じ見た目）だけを出し、手番のカットインは出さない（2回続けて出さない）。
// 画面が入れ替わる時（町・イベント・ダンジョンから戻る時など）は、受け渡しの画面が出ないことがあるので、今までどおりカットインを出す。
import type { PlayerId } from '../types';

export function handoffReplacesCutin(o: {
  online: boolean;
  /** 前と後の、見ている場面が世界マップか */
  worldBefore: boolean;
  worldAfter: boolean;
  prevPlayer?: PlayerId;
  nextPlayer?: PlayerId;
  /** 生きているキャラの担当の人の数 */
  players: number;
}): boolean {
  return !o.online && o.worldBefore && o.worldAfter && o.players > 1 && !!o.prevPlayer && !!o.nextPlayer && o.prevPlayer !== o.nextPlayer;
}
