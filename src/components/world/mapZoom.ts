// ===== 世界マップの拡大（見た目だけ。この端末の設定に保存し、冒険の保存データには入れない）=====
// 1倍 = 今までの大きさ（これより小さくはしない）。最大はオーナーの見本の画像
// （docs/tasks/ref/world-zoom-max-sample.jpg: 幅418pxの画面にマスが約3.3個 = 1マス約126px）に合わせた。
// 390px の画面の1倍のマスの幅は約46px（地図の幅8マス）なので、見本の大きさ（約118px）は約2.55倍。
// ボタンで押しやすい区切り（0.25ずつ）にそろえて、最大を2.5倍にした（画面の横にマスが約3.4個）。

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2.5;
export const ZOOM_STEP = 0.25;

/** 拡大の値を範囲に収める（壊れた値は1倍）。小数は2けたまで */
export function clampZoom(z: unknown): number {
  if (typeof z !== 'number' || !Number.isFinite(z)) return ZOOM_MIN;
  return Math.round(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)) * 100) / 100;
}

/** ＋・−のボタン: 0.25の区切りの次の値へ（ピンチで半端な値になっていても、区切りにそろえる） */
export function stepZoom(z: number, dir: 1 | -1): number {
  const k = (clampZoom(z) - ZOOM_MIN) / ZOOM_STEP;
  const next = dir > 0 ? Math.floor(k + 1e-6) + 1 : Math.ceil(k - 1e-6) - 1;
  return clampZoom(ZOOM_MIN + next * ZOOM_STEP);
}

/**
 * 拡大の前後で、枠の中の同じ点（ピンチの指の間・ボタンなら枠の真ん中）に同じ地面が来るスクロールの位置。
 * 地図の中の座標はマスの半径 R に比例する（上下の余白 padY は R によらない）。
 */
export function anchorScroll(
  a: { left: number; top: number; ax: number; ay: number; padY: number },
  oldR: number,
  newR: number,
): { left: number; top: number } {
  const k = newR / oldR;
  const mx = (a.left + a.ax) * k;
  const my = (a.top + a.ay - a.padY) * k;
  return { left: mx - a.ax, top: my + a.padY - a.ay };
}
