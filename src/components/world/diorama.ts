// ===== 世界マップの箱庭（ジオラマ）の見た目の計算（play-feedback-plan §8） =====
// 六角柱の高さ・側面・道のつながり・地域の境目。見た目だけの計算で、ゲームの状態・乱数・保存には関係しない。
// 乱数は使わず、マスの番号から作るハッシュで「マスごとに少し違う」を出す（毎回同じ見た目になる）。
import type { WorldState } from '../../types';

/** 1段の高さ（マスの半径 R に対する割合） */
export const LEVEL_STEP = 0.14;
/** 一番高い段 */
export const MAX_LEVEL = 3;
/** 六角柱の土台の厚み（高さ0の水でも、これだけ側面が見える。R に対する割合） */
export const BASE_DEPTH = 0.18;
/** 上の面の大きさ（R に対する割合）。少し小さくして、マスどうしの間に溝と側面を見せる */
export const TOP_SCALE = 0.93;

/** 地形の高さ（0〜3）。水・海=0、平地=1、森・丘=2、山・火山=3 */
const LEVEL: Record<string, number> = {
  water: 0,
  sea: 0,
  forest: 2,
  hills: 2,
  mountain: 3,
  lava: 3,
};
export function terrainLevel(terrainId: string): number {
  return LEVEL[terrainId] ?? 1;
}

/** マスの高さ（魔王城などの最後のダンジョンは山と同じ一番上） */
export function tileLevel(t: WorldState['tiles'][number], finale: boolean): number {
  return finale ? MAX_LEVEL : terrainLevel(t.t);
}

/** マスの番号から作る 0〜1 の値（salt で別の値） */
export function hash01(i: number, salt = 0): number {
  let h = (i + 1) * 2654435761 + salt * 40503;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = Math.imul(h ^ (h >>> 13), 3266489917);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** 六角形（とがった頭が上）の頂点。0=上、1=右上、2=右下、3=下、4=左下、5=左上 */
export function hexVerts(x: number, y: number, r: number): [number, number][] {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 180) * (60 * k - 90);
    return [x + r * Math.cos(a), y + r * Math.sin(a)] as [number, number];
  });
}

export const pts = (vs: [number, number][]) => vs.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/**
 * 辺 k（頂点 k と k+1 の間）の向こうのマス。辺0=右上、1=右、2=右下、3=左下、4=左、5=左上。
 * 奇数の行は右に半マスずれている（WorldMap の center と同じ）
 */
export function neighborAt(w: Pick<WorldState, 'width' | 'height'>, i: number, k: number): number | undefined {
  const c = i % w.width;
  const r = Math.floor(i / w.width);
  const odd = r & 1;
  const d: [number, number][] = odd
    ? [[1, -1], [1, 0], [1, 1], [0, 1], [-1, 0], [0, -1]]
    : [[0, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const [dc, dr] = d[k];
  const c2 = c + dc;
  const r2 = r + dr;
  if (c2 < 0 || c2 >= w.width || r2 < 0 || r2 >= w.height) return undefined;
  return r2 * w.width + c2;
}

/** 色を暗くする（k = 0〜1。1で黒） */
export function darken(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * (1 - k));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** 道でつなぐ場所（町・神殿・祭壇・ダンジョン・祠・名所・イベント） */
const ROAD_PLACES = new Set(['town', 'temple', 'altar', 'dungeon', 'shrine', 'landmark', 'event']);

/**
 * 道のつながり: 街道のマスと、街道に隣り合う場所のマス。返すのは「そのマスから道が出ていく辺の番号」。
 * 街道のマスが固まっている所で全部の隣をつなぐと、三角の網になって道に見えない。
 * そこで、場所（町など）から順に広げた「木」の形（輪を作らない）でつなぐ。場所どうしが直接隣り合っているだけの時はつながない
 */
export function roadLinks(w: Pick<WorldState, 'width' | 'height' | 'tiles'>, roadTerrain: string): Map<number, number[]> {
  const isRoad = (i: number) => w.tiles[i].t === roadTerrain && !w.tiles[i].f;
  const isPlace = (i: number) => !!w.tiles[i].f && ROAD_PLACES.has(w.tiles[i].f!.kind);
  const out = new Map<number, number[]>();
  const link = (i: number, k: number) => out.set(i, [...(out.get(i) ?? []), k]);
  const back = (k: number) => (k + 3) % 6;
  const reached = new Set<number>();
  // 場所から幅優先で、まだつないでいない街道のマスへ広げる（場所は、隣の街道のマスと全部つなぐ）
  const queue: number[] = [];
  for (let i = 0; i < w.tiles.length; i++) {
    if (!isPlace(i)) continue;
    for (let k = 0; k < 6; k++) {
      const j = neighborAt(w, i, k);
      if (j === undefined || !isRoad(j)) continue;
      link(i, k);
      link(j, back(k));
      if (!reached.has(j)) {
        reached.add(j);
        queue.push(j);
      }
    }
  }
  // どの場所にも隣り合っていない街道のかたまりも、端から広げる
  const roots = [...queue];
  for (let i = 0; i < w.tiles.length; i++) if (isRoad(i) && !reached.has(i)) roots.push(-1 - i);
  const grow = (start: number[]) => {
    while (start.length) {
      const i = start.shift()!;
      for (let k = 0; k < 6; k++) {
        const j = neighborAt(w, i, k);
        if (j === undefined || !isRoad(j) || reached.has(j)) continue;
        reached.add(j);
        link(i, k);
        link(j, back(k));
        start.push(j);
      }
    }
  };
  grow(queue);
  for (const r of roots) {
    if (r >= 0) continue;
    const i = -1 - r;
    if (reached.has(i)) continue;
    reached.add(i);
    grow([i]);
  }
  return out;
}

/** 辺 k の真ん中（中心 x,y・半径 r） */
export function edgeMid(x: number, y: number, r: number, k: number): [number, number] {
  const a = (Math.PI / 180) * (60 * k - 60);
  const d = r * (Math.sqrt(3) / 2);
  return [x + d * Math.cos(a), y + d * Math.sin(a)];
}

/**
 * 1マスの中の道の形（SVG の path）。2本なら中心を通るなめらかな曲線、1本なら中心まで、3本以上は中心で合わさる。
 * 隣のマスの道とは辺の真ん中でつながる
 */
export function roadPath(x: number, y: number, r: number, ks: number[]): string {
  const m = ks.map((k) => edgeMid(x, y, r, k));
  const f = (p: [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  if (m.length === 1) return `M${f(m[0])} Q${f([(m[0][0] + x) / 2, (m[0][1] + y) / 2])} ${x.toFixed(1)} ${y.toFixed(1)}`;
  if (m.length === 2) return `M${f(m[0])} Q${x.toFixed(1)} ${y.toFixed(1)} ${f(m[1])}`;
  return m.map((p) => `M${f(p)} Q${f([(p[0] + x) / 2, (p[1] + y) / 2])} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
}

/** 侵食度の段階（0〜3）: 25%・50%・75% で一段ずつ世界の色を変える */
export const corruptionStage = (c: number) => (c >= 75 ? 3 : c >= 50 ? 2 : c >= 25 ? 1 : 0);
