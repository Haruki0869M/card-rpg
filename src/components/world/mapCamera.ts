// ===== 世界マップのカメラ（フェーズ2-D）。見た目だけ =====
// 地図の上下に「見えている枠の半分」の余白を足して、地図の端のマスでも駒を枠の真ん中に置けるようにする
// （始めの町が地図の下の端にあると、スクロールが一番下で止まって、駒が枠の下の端に寄っていた）。

/** 地図の上下の余白（px）。見えている枠の高さの半分 */
export const mapPadY = (viewH: number) => Math.max(0, Math.round(viewH / 2));

/** マスの中心 y（地図の中の座標）を枠の真ん中に置くスクロールの位置 */
export const cameraTop = (y: number, viewH: number) => y + mapPadY(viewH) - viewH / 2;

/**
 * 行き先を選んだ時: 選んだマスが枠の中に見えていれば動かさない（タップした所がずれないように）。
 * 見えていなければ、今の駒と選んだマスの中間を真ん中にする。戻り値は新しいスクロールの位置（動かさない時は undefined）
 */
export function revealTop(hereY: number, selY: number, scrollTop: number, viewH: number, margin: number): number | undefined {
  const pad = mapPadY(viewH);
  const sy = selY + pad;
  if (sy >= scrollTop + margin && sy <= scrollTop + viewH - margin) return undefined;
  return (hereY + selY) / 2 + pad - viewH / 2;
}

/**
 * 横も同じ決まり（拡大して地図が枠より広い時）。選んだマスが枠の中に見えていれば動かさない。
 * 見えていなければ、今の駒と選んだマスの中間を真ん中にする。横には余白が無い
 */
export function revealLeft(hereX: number, selX: number, scrollLeft: number, viewW: number, margin: number): number | undefined {
  if (selX >= scrollLeft + margin && selX <= scrollLeft + viewW - margin) return undefined;
  return (hereX + selX) / 2 - viewW / 2;
}
