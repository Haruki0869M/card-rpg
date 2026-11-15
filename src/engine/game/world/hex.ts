// ===== 六角形のマス（ヘックス）。縦長の地図（行が上下に並ぶ）。奇数行を右に半マスずらす（odd-r） =====
import { getTerrain } from '../../../data/world';
import type { WorldState } from '../../../types';
import { tideNow } from './time';

export const idxOf = (w: Pick<WorldState, 'width'>, col: number, row: number) => row * w.width + col;
export const colOf = (w: Pick<WorldState, 'width'>, i: number) => i % w.width;
export const rowOf = (w: Pick<WorldState, 'width'>, i: number) => Math.floor(i / w.width);
export const inside = (w: Pick<WorldState, 'width' | 'height'>, col: number, row: number) => col >= 0 && row >= 0 && col < w.width && row < w.height;

const EVEN = [
  [+1, 0],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, +1],
  [0, +1],
];
const ODD = [
  [+1, 0],
  [+1, -1],
  [0, -1],
  [-1, 0],
  [0, +1],
  [+1, +1],
];

/** 隣の6マス（地図の外は除く） */
export function neighbors(w: Pick<WorldState, 'width' | 'height'>, i: number): number[] {
  const c = colOf(w, i);
  const r = rowOf(w, i);
  const out: number[] = [];
  for (const [dc, dr] of r % 2 ? ODD : EVEN) if (inside(w, c + dc, r + dr)) out.push(idxOf(w, c + dc, r + dr));
  return out;
}

/** 向き d（0=右・1=右上・2=左上・3=左・4=左下・5=右下）の隣のマス（地図の外は undefined） */
export function neighborInDir(w: Pick<WorldState, 'width' | 'height'>, i: number, d: number): number | undefined {
  const c = colOf(w, i);
  const r = rowOf(w, i);
  const [dc, dr] = (r % 2 ? ODD : EVEN)[((d % 6) + 6) % 6];
  return inside(w, c + dc, r + dr) ? idxOf(w, c + dc, r + dr) : undefined;
}

/** 2マスの距離（ヘックスの歩数） */
export function hexDistance(w: Pick<WorldState, 'width'>, a: number, b: number): number {
  const toCube = (i: number) => {
    const c = colOf(w, i);
    const r = rowOf(w, i);
    const x = c - (r - (r & 1)) / 2;
    return [x, -x - r, r];
  };
  const [ax, ay, az] = toCube(a);
  const [bx, by, bz] = toCube(b);
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

/**
 * 入るのにかかる移動力（0 は通れない）。from = どのマスから入るか（潮のマスだけが見る。省略は「外から入る」）。
 * 潮のマス（シナリオ3の作り直し §3-1）: 開いている潮の間だけ移動力1（潮の水道は船も要る）。閉じていても入る向きだけ閉じる（オーナーの決定 6-A）:
 * 潮の首の盆地・入り江の中（Tile.tideIn）から首へは、いつでも出られる。潮のマスの上から隣の陸・海へ出るのは、そのマスの移動力のまま
 */
export function moveCostOf(w: WorldState, i: number, from?: number): number {
  const t = getTerrain(w.tiles[i].t);
  if (t.tide) {
    if (from !== undefined && w.tiles[from]?.tideIn) return 1;
    if (tideNow(w) !== t.tide) return 0;
    return t.tideShip ? (w.ship ? (t.shipCost ?? 1) : 0) : 1;
  }
  // 海は船があるパーティだけが進める（K4 段3）
  return t.sea && w.ship ? (t.shipCost ?? 1) : t.moveCost;
}

/**
 * from から到達できるマスと、そこまでの最小の移動力・経路（ダイクストラ法）。
 * 霧の中のマスには入れない。敵のいるマスには入れるが、その先へは進めない（そこで遭遇する）
 */
export function reachable(w: WorldState, from: number, budget: number): Map<number, { cost: number; prev: number }> {
  const best = new Map<number, { cost: number; prev: number }>([[from, { cost: 0, prev: -1 }]]);
  const enemyAt = new Set(w.wanderers.map((x) => x.tile));
  const open: number[] = [from];
  while (open.length) {
    // 移動力が小さい順（マスは高々数百なので単純な選び方で十分）
    let k = 0;
    for (let j = 1; j < open.length; j++) if (best.get(open[j])!.cost < best.get(open[k])!.cost) k = j;
    const cur = open.splice(k, 1)[0];
    const base = best.get(cur)!.cost;
    if (cur !== from && enemyAt.has(cur)) continue;
    for (const n of neighbors(w, cur)) {
      if (!w.tiles[n].seen) continue;
      const mc = moveCostOf(w, n, cur);
      if (mc <= 0) continue;
      const cost = base + mc;
      if (cost > budget) continue;
      const old = best.get(n);
      if (!old || cost < old.cost) {
        best.set(n, { cost, prev: cur });
        if (!open.includes(n)) open.push(n);
      }
    }
  }
  return best;
}

/** reachable の結果から経路（from を除き to まで）を取り出す */
export function pathTo(map: Map<number, { cost: number; prev: number }>, to: number): number[] {
  const path: number[] = [];
  for (let cur = to; cur >= 0 && map.has(cur); cur = map.get(cur)!.prev) {
    if (map.get(cur)!.prev < 0) break;
    path.unshift(cur);
  }
  return path;
}

/**
 * まっすぐな道（広い地図の街道・脇道。段階6a）: 1歩ずつ、目的地に近づく隣のマスのうち、a と b を結ぶ線に一番近いマスを選ぶ。
 * straightPath（幅を探す最短経路）は、隣の調べる順で右へ寄った道になるため、広い地図ではこちらを使う。乱数は使わない（道案内の立て札も、同じ線で街道を求め直す）
 */
export function linePath(w: Pick<WorldState, 'width' | 'height'>, a: number, b: number): number[] {
  const xy = (i: number) => ({ x: colOf(w, i) + 0.5 * (rowOf(w, i) & 1), y: rowOf(w, i) * 0.866 });
  const A = xy(a), B = xy(b);
  const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
  const off = (i: number) => {
    const p = xy(i);
    return Math.abs((B.x - A.x) * (A.y - p.y) - (A.x - p.x) * (B.y - A.y)) / len;
  };
  const path = [a];
  for (let cur = a; cur !== b && path.length <= w.width * w.height; ) {
    const d = hexDistance(w, cur, b);
    const next = neighbors(w, cur).filter((n) => hexDistance(w, n, b) < d).sort((p, q) => off(p) - off(q) || p - q)[0];
    if (next === undefined) break;
    path.push(next);
    cur = next;
  }
  return path;
}
