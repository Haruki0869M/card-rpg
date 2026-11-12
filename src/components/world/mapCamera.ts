// ===== 世界マップのカメラ（フェーズ2-D）。見た目だけ =====
// 地図の上下に余白を足して、地図の端のマスでも駒を「見えている所」の真ん中に置けるようにする
// （始めの町が地図の下の端にあると、スクロールが一番下で止まって、駒が枠の下の端に寄っていた）。
// 地図の枠の大きさはいつも同じ。下の操作パネル（移動中は小さな帯）は地図の上に重ねる。
// inset = 地図の下の端からパネルが隠している高さ。カメラは「枠の上の端〜パネルの上の端」の真ん中に合わせる。

/** 地図の上の余白（px）。枠の高さの半分 */
export const mapPadY = (viewH: number) => Math.max(0, Math.round(viewH / 2));

/**
 * 地図の下の余白（px）。パネルの高さによらず同じ（パネルが縮んだり戻ったりしても、内容の高さが変わらず地図が動かない）。
 * パネルが枠の高さまで隠しても、一番下のマスを見えている所の真ん中に置ける大きさ
 */
export const mapPadBottom = (viewH: number) => Math.max(0, Math.round(viewH));

/** 見えている所（枠からパネルの分を引いた高さ）。パネルが大きすぎても少しは残す */
export const visibleH = (viewH: number, inset = 0) => Math.max(viewH * 0.25, viewH - inset);

/** マスの中心 y（地図の中の座標）を、見えている所の真ん中に置くスクロールの位置 */
export const cameraTop = (y: number, viewH: number, inset = 0) => y + mapPadY(viewH) - visibleH(viewH, inset) / 2;

/**
 * 行き先を選んだ時: 選んだマスが見えている所に入っていれば動かさない（タップした所がずれないように）。
 * 見えていなければ、今の駒と選んだマスの中間を真ん中にする。戻り値は新しいスクロールの位置（動かさない時は undefined）
 */
export function revealTop(hereY: number, selY: number, scrollTop: number, viewH: number, margin: number, inset = 0): number | undefined {
  const pad = mapPadY(viewH);
  const vh = visibleH(viewH, inset);
  const sy = selY + pad;
  if (sy >= scrollTop + margin && sy <= scrollTop + vh - margin) return undefined;
  return (hereY + selY) / 2 + pad - vh / 2;
}

/**
 * 横も同じ決まり（拡大して地図が枠より広い時）。選んだマスが枠の中に見えていれば動かさない。
 * 見えていなければ、今の駒と選んだマスの中間を真ん中にする。横には余白が無い
 */
export function revealLeft(hereX: number, selX: number, scrollLeft: number, viewW: number, margin: number): number | undefined {
  if (selX >= scrollLeft + margin && selX <= scrollLeft + viewW - margin) return undefined;
  return (hereX + selX) / 2 - viewW / 2;
}

/**
 * 地図の端の矢印（回1）: 目的地（枠の中の座標 px, py）が見えている所（box）の外にある時、
 * 見えている所の真ん中から目的地へ向かう線が box の端と交わる所と、向き（度。右 = 0、下 = 90）を返す。見えていれば undefined
 */
export function edgeArrow(px: number, py: number, box: { minX: number; maxX: number; minY: number; maxY: number }): { x: number; y: number; deg: number } | undefined {
  if (box.maxX <= box.minX || box.maxY <= box.minY) return undefined;
  if (px >= box.minX && px <= box.maxX && py >= box.minY && py <= box.maxY) return undefined;
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const dx = px - cx;
  const dy = py - cy;
  const tx = dx ? (dx > 0 ? box.maxX - cx : box.minX - cx) / dx : Infinity;
  const ty = dy ? (dy > 0 ? box.maxY - cy : box.minY - cy) / dy : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t, deg: (Math.atan2(dy, dx) * 180) / Math.PI };
}
