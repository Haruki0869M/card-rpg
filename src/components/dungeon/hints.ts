// ===== ダンジョンの画面に出す案内（フェーズ2-B）。表示だけで、状態・同期は変えない =====
import type { PlayerId } from '../../types';

/**
 * 「扉は全員が『開ける』を選ぶと開きます」を出すか。
 * 1台で遊ぶ時は1回で開くので出さない。別の端末の人がいる時（オンライン）だけ。全体の地図を開いている間も出さない
 */
export function showVoteHint(voters: PlayerId[], isLocal: (p: PlayerId) => boolean, mapOpen: boolean): boolean {
  return !mapOpen && voters.length > 1 && voters.some((p) => !isLocal(p));
}
