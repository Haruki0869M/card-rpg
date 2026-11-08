// ===== 画面の操作の音（K6） =====
// ボタンのタップは画面全体で1か所で拾う。カードを選ぶ・シートや詳細を開く・画面が変わる、は store の変化で鳴らす。
// 音を変えたいボタンには data-sfx="ok|cancel|none" を付ける（none = 鳴らさない。その操作で別の音が鳴る時など）。

import type { SfxId } from './ids';
import { playSound } from './player';

const CANCEL_WORDS = ['閉じる', '戻る', 'キャンセル', 'やめる', '取り消', 'いいえ', '撤退'];
const OK_WORDS = ['決定', 'はい', '発動', '開ける', '始める', 'OK', '出発', '進む', '購入', '買う', '選ぶ', 'これにする', '確定'];

/** ボタンの名前から、タップの音を決める（純粋。テストできる） */
export function tapSound(label: string, hint?: string | null, toggle = false): SfxId | null {
  if (hint === 'none') return null;
  if (toggle) return 'sfx_ui_toggle';
  if (hint === 'ok') return 'sfx_ui_ok';
  if (hint === 'cancel') return 'sfx_ui_cancel';
  const t = label.replace(/\s+/g, '');
  if (CANCEL_WORDS.some((w) => t.includes(w))) return 'sfx_ui_cancel';
  if (OK_WORDS.some((w) => t.includes(w))) return 'sfx_ui_ok';
  return 'sfx_ui_tap';
}

interface Watchable<S> {
  getState(): S;
  subscribe(listener: (state: S, prev: S) => void): () => void;
}

interface UiState {
  screen: string;
  sheet: unknown;
  selection: { cardUid: string } | null;
}

let installed = false;
/** 1回だけ呼ぶ。store は battleStore（循環を避けるため引数で受ける） */
export function installUiSounds<S extends UiState>(store: Watchable<S>, detail?: Watchable<{ detail: unknown }>): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  // ボタンのタップ（押せないボタンは鳴らさない。使えない理由のお知らせは別の音）
  window.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest?.('button, a[href], [role="button"], [data-sfx]');
    if (!el || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
    const id = tapSound(el.getAttribute('aria-label') || (el as HTMLElement).innerText || '', el.getAttribute('data-sfx'), el.hasAttribute('aria-pressed'));
    if (id) playSound(id);
  }, { capture: true, passive: true });

  store.subscribe((s, p) => {
    if (s.selection && s.selection.cardUid !== p.selection?.cardUid) playSound('sfx_ui_card_select');
    if (s.sheet && s.sheet !== p.sheet) playSound('sfx_ui_detail');
    if (s.screen !== p.screen) playSound('sfx_ui_screen');
  });
  detail?.subscribe((s, p) => { if (s.detail && !p.detail) playSound('sfx_ui_detail'); });
}
