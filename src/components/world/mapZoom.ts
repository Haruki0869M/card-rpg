// ===== 世界マップの拡大（見た目だけ。この端末の設定に保存し、冒険の保存データには入れない）=====
// 1倍 = 今までの大きさ（横8列の地図が画面にちょうど収まる大きさ）。最大はオーナーの見本の画像
// （docs/tasks/ref/world-zoom-max-sample.jpg: 幅418pxの画面にマスが約3.3個 = 1マス約126px）に合わせた。
// 390px の画面の1倍のマスの幅は約46px（地図の幅8マス）なので、見本の大きさ（約118px）は約2.55倍。
// ボタンで押しやすい区切り（0.25ずつ）にそろえて、最大を2.5倍にした（画面の横にマスが約3.4個）。
// 段階6a（overhaul-plan-v2 §2-4）: 広い地図（15列）でも1倍は同じマスの大きさ（横に約8.5列が見え、横にもスクロールする）。
// 縮小は「横の全部の列が画面に収まる」まで（15列・390px で約0.55倍）。8列の地図は今までどおり1倍まで。

/** 標準の大きさの1倍（ふだんの縮小の下限）。広い地図だけ、これより小さくできる（minZoomFor） */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2.5;
export const ZOOM_STEP = 0.25;
/** 保存する設定の下限（地図ごとの下限 minZoomFor はこれより大きい。広い地図で縮小した値を、設定に残せるように） */
export const ZOOM_FLOOR = 0.3;
/** 1倍の大きさを決める列の数（前の地図の幅 8列。これより広い地図は横にスクロールする） */
export const REF_COLS = 8;
/** これより小さい拡大では、小さい文字と飾り（木・峰などの立つ絵・水のきらめき）を消し、施設は印だけにする */
export const COMPACT_ZOOM = 0.75;

const SQRT3 = Math.sqrt(3);

/** 1倍のマスの半径（枠の幅から。前と同じ式で、列の数は REF_COLS までで数える。下限18px・上限34px） */
export function baseRadius(containerW: number, width: number): number {
  const cols = Math.min(width, REF_COLS);
  return Math.max(18, Math.min(34, (containerW || 360) / (SQRT3 * (cols + 0.5))));
}

/** 縮小の下限: 地図の横の全部の列が枠に収まる拡大（1倍より大きくはならない。8列以下の地図は1） */
export function minZoomFor(containerW: number, width: number): number {
  if (width <= REF_COLS || !containerW) return ZOOM_MIN;
  const fit = containerW / (SQRT3 * (width + 0.5)) / baseRadius(containerW, width);
  return Math.min(ZOOM_MIN, Math.floor(fit * 100) / 100);
}

/** 拡大の値を範囲に収める（壊れた値は1倍）。小数は2けたまで。min = 縮小の下限（広い地図は1より小さい） */
export function clampZoom(z: unknown, min = ZOOM_MIN): number {
  if (typeof z !== 'number' || !Number.isFinite(z)) return ZOOM_MIN;
  return Math.round(Math.max(min, Math.min(ZOOM_MAX, z)) * 100) / 100;
}

/** ＋・−のボタン: 1倍から0.25ずつの区切りの次の値へ（ピンチで半端な値になっていても、区切りにそろえる。下限は min） */
export function stepZoom(z: number, dir: 1 | -1, min = ZOOM_MIN): number {
  const k = (clampZoom(z, min) - ZOOM_MIN) / ZOOM_STEP;
  const next = dir > 0 ? Math.floor(k + 1e-6) + 1 : Math.ceil(k - 1e-6) - 1;
  return clampZoom(ZOOM_MIN + next * ZOOM_STEP, min);
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
