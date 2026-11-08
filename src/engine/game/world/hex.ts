// ===== 六角形のマス（ヘックス）。縦長の地図（行が上下に並ぶ）。奇数行を右に半マスずらす（odd-r） =====
import { getTerrain } from '../../../data/world';
import type { WorldState } from '../../../types';

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

/** 入るのにかかる移動力（0 は通れない） */
export function moveCostOf(w: WorldState, i: number): number {
  const t = getTerrain(w.tiles[i].t);
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
      const mc = moveCostOf(w, n);
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
