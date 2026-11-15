// ===== 景色の「立つ物」の置き方（docs/tasks/diorama-design.md ④） =====
// 木・峰・尾根・丘・岩・草・葦・枯れ木・侵食の結晶などを、マスをまたいで置く。
// 位置と種類は、マスの番号（2つのマスの組）から作るハッシュで決める（乱数は使わない。オンラインでも全員同じ景色）。
// 見た目だけの計算で、ゲームの状態・保存には関係しない。
import type { WorldState } from '../../../types';
import { GROUND_K, hash01, neighborAt } from '../diorama';

/** 立つ物の種類（絵が来たら scenery/<種類>.webp に差し替わる。sprites.ts） */
export type ItemKind =
  | 'pine'
  | 'broadleaf'
  | 'plainsTree'
  | 'mushroom'
  | 'snowPine'
  | 'iceCrystal'
  | 'iceRock'
  | 'iceTree'
  | 'snowDrift'
  | 'snowRock'
  | 'lighthouse'
  | 'seaReef'
  | 'wreck'
  | 'deadTree'
  | 'peak'
  | 'ridge'
  | 'volcano'
  | 'hill'
  | 'rock'
  | 'grass'
  | 'flower'
  | 'reeds'
  | 'crystal'
  | 'crack';

export interface SceneItem {
  k: ItemKind;
  /** 足元（地図の座標） */
  x: number;
  y: number;
  /** 大きさ（高さ。px） */
  h: number;
  /** 0〜1 の値（形のばらつき） */
  v: number;
  /** 尾根だけ: もう一方の足元 */
  x2?: number;
  y2?: number;
  /** どのマスの物か（この行の地面の後に描く。2つのマスにまたがる物は手前のマス） */
  tile: number;
}

export interface SceneGeom {
  R: number;
  center: (i: number) => { x: number; y: number };
}

/** 道・川が通る線（中心と、出ていく辺の真ん中を結ぶ線）からの近さ。木を道の上に置かない */
function nearLine(px: number, py: number, cx: number, cy: number, R: number, ks: number[] | undefined): number {
  if (!ks?.length) return Infinity;
  let best = Infinity;
  for (const k of ks) {
    const a = (Math.PI / 180) * (60 * k - 60);
    const ex = cx + R * (Math.sqrt(3) / 2) * Math.cos(a);
    const ey = cy + R * (Math.sqrt(3) / 2) * Math.sin(a) * GROUND_K;
    // 線分 (cx,cy)-(ex,ey) までの距離（縦はつぶす前に戻して測る）
    const ux = ex - cx, uy = (ey - cy) / GROUND_K;
    const qx = px - cx, qy = (py - cy) / GROUND_K;
    const t = Math.max(0, Math.min(1, (qx * ux + qy * uy) / (ux * ux + uy * uy || 1)));
    best = Math.min(best, Math.hypot(qx - ux * t, qy - uy * t));
  }
  return best;
}

/** マスの中の、木を置ける場所（マスの半径に対する割合。上から下へ） */
const SPOTS: [number, number][] = [
  [-0.3, -0.62],
  [0.28, -0.6],
  [-0.58, -0.2],
  [0.02, -0.28],
  [0.56, -0.18],
  [-0.32, 0.14],
  [0.3, 0.12],
  [-0.05, 0.4],
  [0.48, 0.36],
  [-0.5, 0.36],
];

const isForest = (t: string) => t === 'forest';
/** 氷の地形（氷原と、シナリオ2の「湖の氷」）。氷の結晶・氷の岩を立てる */
const isIce = (t: string) => t === 'ice' || t === 'lakeIce';
/** 峰の絵を立てる地形（段階6a の険しい山は、山より高い峰で描く。通れないことが見て分かるように） */
const isPeakTerrain = (t: string) => t === 'mountain' || t === 'crag';

export interface ScatterInput {
  w: Pick<WorldState, 'width' | 'height' | 'tiles'>;
  geom: SceneGeom;
  levels: readonly number[];
  /** 道が出ていく辺 */
  links: Map<number, number[]>;
  /** 川が出ていく辺 */
  rivers: Map<number, number[]>;
  /** 立つ物を置かないマス（場所のマス・最後の城） */
  blocked: (i: number) => boolean;
  /** 侵食度の段階（0〜3） */
  stage: number;
}

/**
 * 立つ物の一覧（足元の y の順に並べてある。手前の物ほど後ろ）。
 * 見えているマスの物だけ。2つのマスにまたがる物（辺の木・尾根）は、両方が見えている時だけ
 */
export function scatter({ w, geom, levels, links, rivers, blocked, stage }: ScatterInput): SceneItem[] {
  const { R, center } = geom;
  const out: SceneItem[] = [];
  const seen = (i: number | undefined): i is number => i !== undefined && !!w.tiles[i]?.seen;
  const T = (i: number) => w.tiles[i].t;
  const clearOf = (i: number, x: number, y: number, c: { x: number; y: number }, gap: number) =>
    nearLine(x, y, c.x, c.y, R, links.get(i)) > R * gap && nearLine(x, y, c.x, c.y, R, rivers.get(i)) > R * gap;

  // 灯台: 町ごとに1つ、町のとなりの海のマスのうち、ハッシュで選んだ1マス（町が海に面していなければ無し）
  const lighthouseTiles = new Set<number>();
  for (let j = 0; j < w.tiles.length; j++) {
    if (w.tiles[j].f?.kind !== 'town') continue;
    const seas = [0, 1, 2, 3, 4, 5].map((k) => neighborAt(w, j, k)).filter((n): n is number => n !== undefined && T(n) === 'sea');
    if (seas.length) lighthouseTiles.add(seas.sort((a, b) => hash01(a, 140) - hash01(b, 140))[0]);
  }

  for (let i = 0; i < w.tiles.length; i++) {
    if (!seen(i) || blocked(i)) continue;
    const t = T(i);
    const c = center(i);
    const h = (s: number) => hash01(i, s);
    // 侵食度が高いほど、森の木が枯れる（見た目だけ）
    const dead = (s: number) => stage >= 2 && hash01(i, 300 + s) < 0.12 * (stage - 1);
    if (isIce(t)) {
      // 氷原: 氷の結晶・氷の岩・凍った木をまばらに。湖の氷は、滑って進む道なので、ほとんど何も置かない（結晶と雪だまりが少しだけ）
      const lake = t === 'lakeIce';
      const put = (k: ItemKind, s: number, size: number) => {
        const x = c.x + (h(s) - 0.5) * R * 1.1;
        const y = c.y + (h(s + 1) - 0.5) * R * 0.95 * GROUND_K;
        if (clearOf(i, x, y, c, 0.3)) out.push({ k, x, y, h: R * size * (0.9 + h(s + 2) * 0.25), v: h(s + 3), tile: i });
      };
      if (lake) {
        if (h(80) < 0.14) put('iceCrystal', 81, 0.5);
        if (h(85) < 0.16) put('snowDrift', 86, 0.28);
      } else {
        if (h(1) < 0.4) put('iceTree', 90, 0.78);
        if (h(80) < 0.5) put('iceCrystal', 81, 0.58);
        if (h(94) < 0.3) put('iceRock', 95, 0.38);
      }
      continue;
    }
    if (isForest(t) || t === 'snow') {
      // 森: 少しずらした格子に 5〜8 本。森の地面の中の道・川の上には置かない
      const n = t === 'forest' ? 5 + Math.floor(h(2) * 4) : 2 + Math.floor(h(2) * 2);
      const order = SPOTS.map((_, j) => j).sort((a, b) => hash01(i * 16 + a, 5) - hash01(i * 16 + b, 5)).slice(0, n);
      for (const j of order) {
        const [sx, sy] = SPOTS[j];
        const x = c.x + (sx + (hash01(i * 16 + j, 6) - 0.5) * 0.16) * R;
        const y = c.y + (sy + (hash01(i * 16 + j, 7) - 0.5) * 0.14) * R * GROUND_K;
        if (!clearOf(i, x, y, c, 0.3)) continue;
        const k: ItemKind = t !== 'forest' ? 'snowPine' : dead(j) ? 'deadTree' : hash01(i * 16 + j, 8) < 0.62 ? 'pine' : 'broadleaf';
        out.push({ k, x, y, h: R * (0.78 + hash01(i * 16 + j, 9) * 0.32), v: hash01(i * 16 + j, 10), tile: i });
      }
      // 雪原の足元: 雪だまり（2マスに1つくらい）と、雪をかぶった岩（5マスに1つくらい）
      if (t === 'snow') {
        if (h(100) < 0.45) {
          const x = c.x + (h(101) - 0.5) * R * 1.0;
          const y = c.y + (h(102) - 0.2) * R * 0.8 * GROUND_K;
          if (clearOf(i, x, y, c, 0.3)) out.push({ k: 'snowDrift', x, y, h: R * 0.28, v: h(103), tile: i });
        }
        if (h(104) < 0.22) {
          const x = c.x + (h(105) - 0.5) * R * 1.0;
          const y = c.y + (h(106) - 0.5) * R * 0.9 * GROUND_K;
          if (clearOf(i, x, y, c, 0.3)) out.push({ k: 'snowRock', x, y, h: R * 0.3, v: h(107), tile: i });
        }
      }
      // 森の足元のキノコ（4マスに1つくらい）
      if (t === 'forest' && h(3) < 0.28) {
        const x = c.x + (h(4) - 0.5) * R * 0.9;
        const y = c.y + (h(5) - 0.3) * R * 0.7 * GROUND_K;
        if (clearOf(i, x, y, c, 0.25)) out.push({ k: 'mushroom', x, y, h: R * 0.22, v: h(6), tile: i });
      }
      continue;
    }
    if (isPeakTerrain(t)) {
      // 山: 峰の絵。山脈の真ん中ほど高い（隣の山の数）
      const nb = [0, 1, 2, 3, 4, 5].filter((k) => {
        const j = neighborAt(w, i, k);
        return j !== undefined && isPeakTerrain(T(j));
      }).length;
      const tall = t === 'crag' ? 0.45 : 0;
      out.push({ k: 'peak', x: c.x + (h(11) - 0.5) * R * 0.2, y: c.y + R * 0.42 * GROUND_K, h: R * (1.35 + tall + nb * 0.14 + h(12) * 0.3), v: h(13), tile: i });
      continue;
    }
    if (t === 'lava') {
      out.push({ k: 'volcano', x: c.x, y: c.y + R * 0.4 * GROUND_K, h: R * (1.2 + h(12) * 0.25), v: h(13), tile: i });
      continue;
    }
    if (t === 'hills') {
      const n = 1 + (h(14) < 0.55 ? 1 : 0);
      for (let j = 0; j < n; j++) {
        const x = c.x + (j ? 0.3 : -0.22 + (h(15) - 0.5) * 0.2) * R;
        const y = c.y + (j ? 0.3 : -0.05) * R * GROUND_K;
        if (clearOf(i, x, y, c, 0.32)) out.push({ k: 'hill', x, y, h: R * (0.42 + hash01(i * 4 + j, 16) * 0.16), v: hash01(i * 4 + j, 17), tile: i });
      }
      if (h(18) < 0.5) out.push({ k: 'rock', x: c.x + (h(19) - 0.2) * R * 0.5, y: c.y + R * 0.55 * GROUND_K, h: R * 0.2, v: h(20), tile: i });
      continue;
    }
    if (t === 'swamp') {
      for (let j = 0; j < 2; j++) {
        const x = c.x + (hash01(i * 4 + j, 21) - 0.5) * R * 1.1;
        const y = c.y + (hash01(i * 4 + j, 22) - 0.5) * R * 0.9 * GROUND_K;
        if (clearOf(i, x, y, c, 0.25)) out.push({ k: 'reeds', x, y, h: R * 0.38, v: hash01(i * 4 + j, 23), tile: i });
      }
      if (h(24) < 0.35) out.push({ k: 'deadTree', x: c.x + (h(25) - 0.5) * R * 0.8, y: c.y + (h(26) - 0.3) * R * 0.6 * GROUND_K, h: R * 0.7, v: h(27), tile: i });
      continue;
    }
    if (t === 'blight' || t === 'ash') {
      if (h(28) < 0.6) out.push({ k: t === 'blight' ? 'deadTree' : 'rock', x: c.x + (h(29) - 0.5) * R * 0.8, y: c.y + (h(30) - 0.4) * R * 0.7 * GROUND_K, h: R * (t === 'blight' ? 0.75 : 0.26), v: h(31), tile: i });
      continue;
    }
    if (t === 'reef') {
      // 暗礁: 岩礁の絵を1〜2つ（いつも閉じている。船でも通れない所が分かるように）
      const n = 1 + (h(161) < 0.5 ? 1 : 0);
      for (let q = 0; q < n; q++) {
        const x = c.x + (n === 1 ? 0 : (q - 0.5) * R * 0.6) + (hash01(i * 4 + q, 162) - 0.5) * R * 0.2;
        const y = c.y + (n === 1 ? 0.15 : q * 0.3 - 0.05) * R * GROUND_K;
        out.push({ k: 'seaReef', x, y, h: R * (0.44 + hash01(i * 4 + q, 163) * 0.12), v: hash01(i * 4 + q, 164), tile: i });
      }
      continue;
    }
    if (t === 'sea') {
      // 海（2026-11-16 シナリオ3）: 町のそばの海に灯台を1つ、ところどころに岩礁、まれに難破船。見た目だけ
      if (lighthouseTiles.has(i)) {
        out.push({ k: 'lighthouse', x: c.x + (h(150) - 0.5) * R * 0.2, y: c.y + R * 0.25 * GROUND_K, h: R * 1.05, v: h(151), tile: i });
      } else if (h(152) < 0.025) {
        out.push({ k: 'wreck', x: c.x + (h(153) - 0.5) * R * 0.4, y: c.y + (h(154) - 0.3) * R * 0.5 * GROUND_K, h: R * 0.6, v: h(155), tile: i });
      } else if (h(156) < 0.13) {
        out.push({ k: 'seaReef', x: c.x + (h(157) - 0.5) * R * 0.8, y: c.y + (h(158) - 0.4) * R * 0.7 * GROUND_K, h: R * (0.36 + h(159) * 0.12), v: h(160), tile: i });
      }
      continue;
    }
    if (levels[i] === 0) continue; // 水・海
    // 平原など: 何もない所を多めに残し、草・花・小岩をまばらに（3割のマスだけ）
    if (h(32) < 0.34) {
      const n = 1 + Math.floor(h(33) * 3);
      for (let j = 0; j < n; j++) {
        const x = c.x + (hash01(i * 8 + j, 34) - 0.5) * R * 1.2;
        const y = c.y + (hash01(i * 8 + j, 35) - 0.5) * R * 1.1 * GROUND_K;
        if (!clearOf(i, x, y, c, 0.28)) continue;
        const r = hash01(i * 8 + j, 36);
        const k: ItemKind = r < 0.55 ? 'grass' : r < 0.82 ? 'flower' : 'rock';
        out.push({ k, x, y, h: R * (k === 'rock' ? 0.18 : 0.2), v: hash01(i * 8 + j, 37), tile: i });
      }
    }
    // 平原のところどころに、1本だけ立つ木（1割くらいのマス）
    if (h(60) < 0.12 && !links.has(i)) {
      const x = c.x + (h(61) - 0.5) * R * 0.8;
      const y = c.y + (h(62) - 0.4) * R * 0.7 * GROUND_K;
      if (clearOf(i, x, y, c, 0.35)) out.push({ k: 'plainsTree', x, y, h: R * (0.85 + h(63) * 0.2), v: h(64), tile: i });
    }
    // 森の小道: 街道のマスで、周りに森が多い時は、道の両側に木を寄せる
    if (links.has(i)) {
      const forestNb = [0, 1, 2, 3, 4, 5].filter((k) => {
        const j = neighborAt(w, i, k);
        return seen(j) && isForest(T(j));
      }).length;
      if (forestNb >= 3) {
        for (let j = 0; j < SPOTS.length; j++) {
          const [sx, sy] = SPOTS[j];
          const x = c.x + sx * R;
          const y = c.y + sy * R * GROUND_K;
          if (hash01(i * 16 + j, 38) < 0.45 && clearOf(i, x, y, c, 0.36)) out.push({ k: hash01(i * 16 + j, 39) < 0.6 ? 'pine' : 'broadleaf', x, y, h: R * 0.74, v: hash01(i * 16 + j, 40), tile: i });
        }
      }
    }
  }

  // マスの境目の物: 辺の木（両方が森）・尾根（両方が山）。辺は右・右下・左下の3本だけ見る（同じ組を2回数えない）
  for (let i = 0; i < w.tiles.length; i++) {
    if (!seen(i) || blocked(i)) continue;
    for (const k of [1, 2, 3]) {
      const j = neighborAt(w, i, k);
      if (!seen(j) || blocked(j)) continue;
      const pair = Math.min(i, j) * 1024 + Math.max(i, j);
      const a = center(i), b = center(j);
      if (isForest(T(i)) && isForest(T(j))) {
        const n = 1 + (hash01(pair, 41) < 0.5 ? 1 : 0);
        for (let q = 0; q < n; q++) {
          const f = 0.5 + (hash01(pair * 2 + q, 42) - 0.5) * 0.3;
          // 辺にそって少しずらす（辺の向き = 2つの中心を結ぶ線に直角）
          const side = (hash01(pair * 2 + q, 43) - 0.5) * 0.6;
          const dx = b.x - a.x, dy = (b.y - a.y) / GROUND_K;
          const x = a.x + dx * f - dy * side * 0.5;
          const y = a.y + (dy * f + dx * side * 0.5) * GROUND_K;
          const dd = stage >= 2 && hash01(pair, 301 + q) < 0.12 * (stage - 1);
          out.push({ k: dd ? 'deadTree' : hash01(pair * 2 + q, 44) < 0.6 ? 'pine' : 'broadleaf', x, y, h: R * (0.8 + hash01(pair * 2 + q, 45) * 0.3), v: hash01(pair * 2 + q, 46), tile: j });
        }
      }
      if (isPeakTerrain(T(i)) && isPeakTerrain(T(j))) {
        // 尾根: 2つの峰の足元を結ぶ低い山並み（足元の y は真ん中）
        const ax = a.x, ay = a.y + R * 0.42 * GROUND_K, bx = b.x, by = b.y + R * 0.42 * GROUND_K;
        out.push({ k: 'ridge', x: ax, y: ay, x2: bx, y2: by, h: R * (0.7 + hash01(pair, 47) * 0.25), v: hash01(pair, 48), tile: j });
      }
    }
  }

  // 侵食度: 25/50/75% で、ハッシュで選んだマスに亀裂と紫の結晶を増やす（見た目だけ）
  if (stage > 0) {
    for (let i = 0; i < w.tiles.length; i++) {
      if (!seen(i) || blocked(i) || levels[i] === 0) continue;
      if (hash01(i, 50) >= 0.09 * stage) continue;
      const c = center(i);
      const x = c.x + (hash01(i, 51) - 0.5) * R * 0.8;
      const y = c.y + (hash01(i, 52) - 0.4) * R * 0.7 * GROUND_K;
      out.push({ k: hash01(i, 53) < 0.5 ? 'crystal' : 'crack', x, y, h: R * (0.32 + stage * 0.06), v: hash01(i, 54), tile: i });
    }
  }

  // 足元の y の順（手前ほど後に描く）。尾根は2つの足元の真ん中
  const footY = (it: SceneItem) => (it.k === 'ridge' ? (it.y + (it.y2 ?? it.y)) / 2 - 0.001 : it.y);
  // 地面に描く平たい物（亀裂）は先に
  return out.sort((a, b) => (a.k === 'crack' ? -1 : 0) - (b.k === 'crack' ? -1 : 0) || footY(a) - footY(b));
}

/** 川をつくらない地形（溶岩・灰・瘴気・金属などの地域） */
const NO_RIVER = new Set(['lava', 'ash', 'blight', 'metal', 'steam', 'cloud', 'desert', 'ice']);

/**
 * 見た目だけの川（オーナーの決定で、今回の試作に入れる）。
 * 地域ごとに1本まで: 丘・山のふもとから、近くの湖・海、または地図の左右の端へ流れる。
 * 町などの場所のマスと、丘・山・水のマスは通らない。街道と交わる所は橋（描く時に決める）。
 * 移動には関係しない（渡れる・渡れないはゲームの地形のまま）。返すのは「川が出ていく辺」
 */
export function riverLinks(w: Pick<WorldState, 'width' | 'height' | 'tiles'>, levels: readonly number[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  const used = new Set<number>();
  const link = (i: number, k: number) => out.set(i, [...(out.get(i) ?? []), k]);
  const isWater = (i: number) => levels[i] === 0;
  const passable = (i: number) => !w.tiles[i].f && levels[i] === 1 && !NO_RIVER.has(w.tiles[i].t) && !used.has(i);
  const regions = new Set(w.tiles.map((t) => t.r));
  for (const r of regions) {
    // 湖・海・地図の左右の端からの距離（幅優先）
    const dist = new Map<number, number>();
    const queue: number[] = [];
    for (let i = 0; i < w.tiles.length; i++) {
      if (!passable(i) || w.tiles[i].r !== r) continue;
      const c = i % w.width;
      const nearWater = [0, 1, 2, 3, 4, 5].some((k) => {
        const j = neighborAt(w, i, k);
        return j !== undefined && isWater(j);
      });
      if (nearWater || c === 0 || c === w.width - 1) {
        dist.set(i, 0);
        queue.push(i);
      }
    }
    while (queue.length) {
      const i = queue.shift()!;
      for (let k = 0; k < 6; k++) {
        const j = neighborAt(w, i, k);
        if (j === undefined || dist.has(j) || !passable(j) || w.tiles[j].r !== r) continue;
        dist.set(j, dist.get(i)! + 1);
        queue.push(j);
      }
    }
    // 水源: この地域の丘・山のマスのうち、ふもとから海や端まで 3〜8 マスある所（ハッシュで1つ選ぶ）
    const springs: { src: number; k: number; start: number }[] = [];
    for (let i = 0; i < w.tiles.length; i++) {
      if (w.tiles[i].r !== r || levels[i] !== 2 || w.tiles[i].f || (w.tiles[i].t !== 'hills' && w.tiles[i].t !== 'mountain')) continue;
      for (let k = 0; k < 6; k++) {
        const j = neighborAt(w, i, k);
        const d = j === undefined ? undefined : dist.get(j);
        if (j !== undefined && d !== undefined && d >= 2 && d <= 7) springs.push({ src: i, k, start: j });
      }
    }
    if (!springs.length) continue;
    const pick = springs[Math.floor(hash01(r * 31 + springs.length, 70) * springs.length)];
    // ふもとから、距離が減る方へ下る（同じ距離ならハッシュで選んで蛇行させる）
    let i = pick.start;
    link(i, (pick.k + 3) % 6); // 水源（山の方の辺）
    used.add(i);
    for (let step = 0; step < 12; step++) {
      const d = dist.get(i)!;
      if (d === 0) {
        // 湖・海へ注ぐ、または地図の端から外へ
        const kw = [0, 1, 2, 3, 4, 5].find((k) => {
          const j = neighborAt(w, i, k);
          return j !== undefined && isWater(j);
        });
        const c = i % w.width;
        link(i, kw ?? (c === 0 ? 4 : 1));
        break;
      }
      const next = [0, 1, 2, 3, 4, 5]
        .map((k) => ({ k, j: neighborAt(w, i, k) }))
        .filter((o): o is { k: number; j: number } => o.j !== undefined && dist.get(o.j) === d - 1 && !used.has(o.j))
        .sort((a, b) => hash01(a.j, 71) - hash01(b.j, 71))[0];
      if (!next) break;
      link(i, next.k);
      link(next.j, (next.k + 3) % 6);
      used.add(next.j);
      i = next.j;
    }
  }
  return out;
}
