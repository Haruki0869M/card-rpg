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

// ===== 狭い画面 回2（項目1・オーナーの決定 Q6 = A。ふつうの画面にも入れる） =====
// 地図の上下には余白があるが、左右には無かった。右上・右下の固定のボタンの列（見取り図・拡大・戻る）の下に
// 右の端のマス・駒・♨ の札・地名の札が入り、押すとボタンに当たっていた。
// 地図の右に、ボタンの列の幅ぶんの余白を足す（指で動かせば、右の端のマスをボタンの無い所まで引き出せる）。
// カメラの初めの位置・追いかけ方は今までどおり真ん中（余白は自動では見せない = 横の位置は前と同じ範囲に収める）。
// 駒・選んだマス・次の行き先がボタンの下に入る時だけ、いちばん小さく動かして寄せる（dodgeButtons）。

/** 地図の右の余白（px）。ボタンの列の幅 56 ＋ 右の端 8 ＋ すき間 8 */
export const MAP_PAD_RIGHT = 72;

/** 前と同じ横の範囲（余白を見せない）に収めた、横のスクロールの位置。mapW = 地図の幅（余白を除く） */
export const clampLeft = (left: number, viewW: number, mapW: number) => Math.max(0, Math.min(Math.max(0, mapW - viewW), left));

/** 枠の中の四角（px） */
export interface Box { left: number; top: number; right: number; bottom: number }

/**
 * 点（枠の中の座標 px, py。半径 r の丸として見る）が、固定のボタン（rects）にかかっていれば、かからない所へ寄せる
 * スクロールの差（scrollLeft・scrollTop に足す量）を返す。かかっていなければ undefined。
 * 寄せ方は、ボタンの左・右・上・下へ出す4つのうち、動く量がいちばん小さく、動かせる範囲（room）の中で、
 * 寄せた後も真ん中が見えている所（view）の中にあり、ほかのボタンにもかからない物。どれもできなければ undefined（動かさない）
 */
export function dodgeButtons(
  px: number,
  py: number,
  r: number,
  rects: readonly Box[],
  view: Box,
  room: { left: number; right: number; up: number; down: number },
): { dx: number; dy: number } | undefined {
  const hits = (x: number, y: number) => rects.some((b) => x + r > b.left && x - r < b.right && y + r > b.top && y - r < b.bottom);
  if (!hits(px, py)) return undefined;
  const cands: { dx: number; dy: number }[] = [];
  for (const b of rects) {
    if (!(px + r > b.left && px - r < b.right && py + r > b.top && py - r < b.bottom)) continue;
    // dx > 0 = 地図を左へ（点が左へ動く）。dy > 0 = 地図を上へ（点が上へ動く）
    cands.push({ dx: px + r - b.left, dy: 0 }, { dx: -(b.right + r - px), dy: 0 }, { dx: 0, dy: py + r - b.top }, { dx: 0, dy: -(b.bottom + r - py) });
  }
  cands.sort((a, b) => Math.abs(a.dx) + Math.abs(a.dy) - (Math.abs(b.dx) + Math.abs(b.dy)));
  for (const c of cands) {
    const dx = Math.ceil(Math.abs(c.dx)) * Math.sign(c.dx);
    const dy = Math.ceil(Math.abs(c.dy)) * Math.sign(c.dy);
    if (dx > room.right || -dx > room.left || dy > room.down || -dy > room.up) continue;
    const x = px - dx, y = py - dy;
    // 真ん中が見えている所の中（端から r の半分より内側）。端の列のマスは丸の一部が枠の外に出ていてよい（押すのは真ん中）
    if (x < view.left + r / 2 || x > view.right - r / 2 || y < view.top + r / 2 || y > view.bottom - r / 2) continue;
    if (hits(x, y)) continue;
    return { dx, dy };
  }
  return undefined;
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
