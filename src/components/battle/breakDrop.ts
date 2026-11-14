// ===== 「⚡BREAK!」の文字の高さ（狭い画面の直し 回3・計画 項目5） =====
// 技名の帯が出ている約0.5秒、絵が小さい（40px。低い画面・360×640 の敵3体以上）と BREAK の文字が帯の後ろに隠れた。
// 帯の下の端より下に出す。画面の高さではなく、絵の高さと敵の欄の位置で決まる

/** 技名の帯（CalloutBand）の上の端と、帯の下の端（帯の高さ 32px ＋ 少しの隙間）。戦場の上から（px） */
export const CALLOUT_TOP = 22;
export const CALLOUT_CLEAR = CALLOUT_TOP + 32 + 2;

/**
 * 「⚡BREAK!」を下げる量（px）。今までどおり絵の高さの4割下げ、それでも帯の下の端より上なら、帯の下まで下げる。
 * h = 絵の高さ・unitTop = 敵の欄の上の端（戦場の上から）・popupTop = 数字の箱の上の端（敵の欄の上から）
 */
export function breakDropFor(h: number, unitTop: number, popupTop: number): number {
  return Math.max(Math.round(h * 0.4), Math.ceil(CALLOUT_CLEAR - unitTop - popupTop));
}
