// ===== この端末だけの窓を、画面が変わった時に閉じる（2026-11-15 公開前の点検 B1） =====
// 状態の一覧（「＋N」）と長押しの詳しい説明（DetailPopup）は、画面の外の入れ物（store）に「開いている」を持つ。
// 開いたまま戦闘が終わる・次の戦闘へ進む・世界マップやダンジョンへ移ると、勝利画面の上に残ったり、
// 次の戦闘の始めに開いた形で出たりする。見ている画面が変わったら、両方を閉じる。
// どちらもこの端末だけの窓（ゲームの操作は送らない）なので、2人で遊んでも相手には関係しない。
import { useDetail } from '../../hooks/usePress';
import type { BattleState, GameState } from '../../types';
import { useStatusList } from '../battle/StatusListPopup';

type View = { screen: string; scene: string; game: GameState | null; battle: BattleState };

const ENDED = new Set(['victory', 'defeat', 'escaped']);

/** 見ている画面の印。これが変わったら「画面が変わった」（戦闘は、始まり〜終わる前・終わった後 を分ける。別の戦闘も別の印） */
export function viewKey(s: View): string {
  const mode = s.game?.mode ?? '-';
  const base = `${s.screen}|${s.scene}|${mode}`;
  if (mode !== 'battle') return base;
  const b = s.battle;
  return `${base}|${b.encounterId}|${b.seed}|${ENDED.has(b.phase) ? 'end' : 'live'}`;
}

/** この端末だけの窓を全部閉じる */
export function closeLocalWindows() {
  if (useStatusList.getState().open) useStatusList.getState().hide();
  if (useDetail.getState().detail) useDetail.getState().hide();
}

/** store を見張り、画面の印が変わったら窓を閉じる。戻り値で見張りをやめる */
export function watchViewChange(store: { getState: () => View; subscribe: (fn: (s: View, prev: View) => void) => () => void }): () => void {
  let last = viewKey(store.getState());
  return store.subscribe((s) => {
    const k = viewKey(s);
    if (k === last) return;
    last = k;
    closeLocalWindows();
  });
}
