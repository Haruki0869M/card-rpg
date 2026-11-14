// ===== アプリの中のブラウザ（LINE など）の見分け（実機の不具合③・点検 F4 2026-11-15） =====
// LINE の中のブラウザは通信が切れやすく、画面の高さもずれやすい。部屋に入る前だけ、外のブラウザで開く案内を出す。
// 待合室・冒険中には出さない（ほかのブラウザで開き直すと、別の端末IDになって席を失うため）。

export type InAppBrowser = 'line' | 'other' | null;

/** User-Agent から、アプリの中のブラウザかを見分ける。見分けやすい物だけ（Android の `; wv)` は広すぎるので見ない） */
export function inAppBrowser(ua: string | undefined = typeof navigator === 'undefined' ? undefined : navigator.userAgent): InAppBrowser {
  if (!ua) return null;
  if (/\bLine\//.test(ua)) return 'line';
  if (/FBAN|FBAV|Instagram/.test(ua)) return 'other';
  return null;
}

/** 案内の文 */
export function inAppBrowserNote(kind: InAppBrowser): string | null {
  if (kind === 'line') return 'LINE の中のブラウザで開いています。右上のメニューから「ほかのブラウザで開く」を選ぶと、通信が切れにくく快適に遊べます';
  if (kind === 'other') return 'アプリの中のブラウザで開いています。メニューから「ブラウザで開く」を選ぶと、通信が切れにくく快適に遊べます';
  return null;
}

/** 招待のリンクに付ける印。LINE はこの印の付いたリンクを、最初から外のブラウザ（Chrome など）で開く。このゲームは読まない */
export const OPEN_EXTERNAL_PARAM = 'openExternalBrowser';
