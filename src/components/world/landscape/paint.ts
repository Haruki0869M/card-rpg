// ===== 景色の層を Canvas に描く（docs/tasks/diorama-design.md ④「景色の層の作り」） =====
// 行ごとに奥から手前へ: その行の地面（崖・上の面・にじみ・岸辺・川・道・地域の境目）→ その行の立つ物（足元の y の順）。
// 手前の行の地面が、奥の行の木や峰の足元を少し隠すので、地面から生えて見える。
import { artImage } from '../../../art/images';
import type { TerrainDef, WorldState } from '../../../types';
import { BASE_DEPTH, GROUND_K, hash01, hexVerts, LEVEL_STEP, neighborAt } from '../diorama';
import type { SceneItem } from './scatter';
import { drawItem, itemExtent, loadedImage } from './sprites';

export interface PaintGeom {
  R: number;
  hexW: number;
  W: number;
  H: number;
  center: (i: number) => { x: number; y: number };
  ground: (i: number) => { x: number; y: number };
}

export interface PaintInput {
  w: Pick<WorldState, 'width' | 'height'>;
  tiles: WorldState['tiles'];
  geom: PaintGeom;
  levels: readonly number[];
  links: Map<number, number[]>;
  rivers: Map<number, number[]>;
  /** 地域ごとの、街道のマスの下に敷く地形 */
  under: readonly string[];
  roadTerrain: string;
  items: SceneItem[];
  /** 地形の色と寒さ・暑さ（別スレッドでも描けるように、データの表を引かずに渡す） */
  terrains: TerrainLook;
}

export type TerrainLook = Record<string, Pick<TerrainDef, 'color' | 'climate'>>;

type V = [number, number];

/**
 * マスの上の面の頂点（少しゆがんだ六角形）。隣のマスと同じ頂点は同じだけずらすので、かみ合ってすき間ができない。
 * ずらす量は「頂点の床の位置」から作るハッシュ（マスの番号ではなく位置なので、どのマスから見ても同じ）
 */
export function topVerts(g: PaintGeom, i: number, lv: number): V[] {
  const { R, hexW } = g;
  const gr = g.ground(i);
  const o = g.ground(0);
  const lift = lv * LEVEL_STEP * R;
  return hexVerts(gr.x, gr.y, R).map(([x, y]) => {
    const kx = Math.round((x - o.x) / (hexW / 2));
    const ky = Math.round((y - o.y) / ((R * GROUND_K) / 2));
    const key = (kx + 64) * 4096 + (ky + 64);
    return [x + (hash01(key, 90) - 0.5) * R * 0.2, y + (hash01(key, 91) - 0.5) * R * 0.16 * GROUND_K - lift] as V;
  });
}

const poly = (ctx: CanvasRenderingContext2D, v: V[]) => {
  ctx.beginPath();
  ctx.moveTo(v[0][0], v[0][1]);
  for (let k = 1; k < v.length; k++) ctx.lineTo(v[k][0], v[k][1]);
  ctx.closePath();
};

/** 辺 k の真ん中（ゆがんだ頂点から） */
const mid = (v: V[], k: number): V => [(v[k][0] + v[(k + 1) % 6][0]) / 2, (v[k][1] + v[(k + 1) % 6][1]) / 2];

/** 道・川の線（2本なら中心を通るなめらかな曲線。中心はハッシュで少し揺らす） */
function flowPath(ctx: CanvasRenderingContext2D, v: V[], cx: number, cy: number, ks: number[], wob: number) {
  const m = ks.map((k) => mid(v, k));
  ctx.beginPath();
  if (m.length === 2) {
    ctx.moveTo(m[0][0], m[0][1]);
    ctx.quadraticCurveTo(cx + wob, cy + wob * 0.4, m[1][0], m[1][1]);
    return;
  }
  for (const p of m) {
    ctx.moveTo(p[0], p[1]);
    ctx.quadraticCurveTo((p[0] + cx) / 2 + wob * 0.5, (p[1] + cy) / 2, cx, cy);
  }
}

/** 道のふちと、模様の絵が無い時の土の色 */
const ROAD_EDGE = '#6e5533';
const ROAD_SOIL = '#c6a272';
/** 路肩に混ぜる土の色 */
const ROAD_SHOULDER = '#5e4526';
/** 路肩に草を描く地形（草の生える所） */
const ROAD_GRASSY = new Set(['plains', 'forest', 'hills', 'swamp']);
/** 道の線（2次のベジェ曲線）: a → b。c は曲げる点 */
interface RoadSeg {
  a: V;
  c: V;
  b: V;
}
const quadAt = (s: RoadSeg, u: number): V => {
  const m = 1 - u;
  return [m * m * s.a[0] + 2 * m * u * s.c[0] + u * u * s.b[0], m * m * s.a[1] + 2 * m * u * s.c[1] + u * u * s.b[1]];
};
/** 進む向き（長さ1） */
const quadTangent = (s: RoadSeg, u: number): V => {
  const m = 1 - u;
  const dx = 2 * m * (s.c[0] - s.a[0]) + 2 * u * (s.b[0] - s.c[0]);
  const dy = 2 * m * (s.c[1] - s.a[1]) + 2 * u * (s.b[1] - s.c[1]);
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
};
/** 道に直角の向き（長さ1） */
const quadNormal = (s: RoadSeg, u: number): V => {
  const [tx, ty] = quadTangent(s, u);
  return [-ty, tx];
};
/** 幅が変わる帯（行き止まりの先細り）。width(u) = その場所の幅 */
function ribbon(ctx: CanvasRenderingContext2D, s: RoadSeg, width: (u: number) => number) {
  const N = 12;
  const left: V[] = [], right: V[] = [];
  for (let q = 0; q <= N; q++) {
    const u = q / N;
    const [px, py] = quadAt(s, u);
    const [nx, ny] = quadNormal(s, u);
    const h = width(u) / 2;
    left.push([px + nx * h, py + ny * h]);
    right.push([px - nx * h, py - ny * h]);
  }
  ctx.beginPath();
  left.forEach((q, n) => (n ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  right.reverse().forEach((q) => ctx.lineTo(q[0], q[1]));
  ctx.closePath();
}
/** 2つの色（#rrggbb）を混ぜる。k = b の割合。読めない色は b */
const mixCache = new Map<string, string>();
function mixHex(a: string, b: string, k: number): string {
  const key = `${a}|${b}|${k.toFixed(2)}`;
  let out = mixCache.get(key);
  if (out) return out;
  const rgb = (h: string) => (/^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map((n) => parseInt(h.slice(n, n + 2), 16)) : undefined);
  const pa = rgb(a), pb = rgb(b);
  out = pa && pb ? `rgb(${pa.map((x, n) => Math.round(x + (pb[n] - x) * k)).join(',')})` : b;
  mixCache.set(key, out);
  return out;
}
/** 土の道の模様（terrain/road-path。256px・つなぎ目なし。わだちが縦（上下）に走る）。描く ctx ごとに1つ作り置く */
const roadPats = new WeakMap<object, CanvasPattern | null>();
function roadPattern(ctx: CanvasRenderingContext2D, R: number, angle: number, cx: number, cy: number): CanvasPattern | null {
  let p = roadPats.get(ctx);
  if (p === undefined) {
    const img = loadedImage(artImage('terrain/road-path'));
    if (!img) return null;
    p = ctx.createPattern(img, 'repeat');
    roadPats.set(ctx, p);
  }
  if (!p || typeof DOMMatrix === 'undefined') return p ?? null;
  // 道の向きに、絵のわだち（縦）を合わせる。絵の1枚 = マスの大きさの 0.8 倍
  const s = (R * 0.8) / 256;
  p.setTransform(new DOMMatrix().translateSelf(cx, cy).rotateSelf(((angle - Math.PI / 2) * 180) / Math.PI).scaleSelf(s, s));
  return p;
}

const patCache = new Map<string, CanvasPattern | null>();
let patR = 0;

/** 地面の絵を借りる地形（湖の氷 = 氷原の絵を、明るい色の上に敷く。違いは paintTile の「氷の照り」で出す） */
const TERRAIN_ART: Record<string, string> = { lakeIce: 'ice' };

/** 地形の模様（描いた絵を R*4 の大きさで敷く）。絵がまだ読み込まれていなければ色だけ */
function terrainPattern(ctx: CanvasRenderingContext2D, id: string, R: number, cache: Map<string, CanvasPattern | null>): CanvasPattern | null {
  if (cache.has(id)) return cache.get(id)!;
  const img = loadedImage(artImage(`terrain/${TERRAIN_ART[id] ?? id}`));
  let p: CanvasPattern | null = null;
  if (img) {
    p = ctx.createPattern(img, 'repeat');
    if (p && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scaleSelf((R * 4) / img.width, (R * 4) / img.height));
  }
  if (p) cache.set(id, p);
  return p;
}

/**
 * 地図の [y0, y1) の帯を描く。origin = この Canvas の上の端の地図の y（ctx は、もう画素の倍率をかけてある）。
 * 帯の外にはみ出す物は、呼ぶ側が帯で切り抜く
 */
export function paintRange(ctx: CanvasRenderingContext2D, inp: PaintInput, y0: number, y1: number, origin = y0) {
  const { w, tiles, geom, levels, links, rivers, under, roadTerrain, items, terrains } = inp;
  const getTerrain = (id: string): TerrainLook[string] => terrains[id] ?? { color: '#888' };
  const { R } = geom;
  ctx.save();
  ctx.translate(0, -origin);
  // 模様は、地図の大きさ（R）が同じ間は作り置きを使う（描き直しのたびに作ると重かった）
  if (patR !== R) {
    patCache.clear();
    patR = R;
  }
  const pats = patCache;
  const topId = (i: number) => (!tiles[i].f && tiles[i].t === roadTerrain ? under[tiles[i].r] ?? 'plains' : tiles[i].t);
  const fillTerrain = (id: string, alpha = 1) => {
    ctx.fillStyle = getTerrain(id).color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    const p = terrainPattern(ctx, id, R, pats);
    if (p) {
      ctx.fillStyle = p;
      ctx.globalAlpha = alpha * 0.68;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const seen = (j: number | undefined) => j !== undefined && !!tiles[j]?.seen;
  const inRange = (i: number) => {
    const c = geom.center(i), g = geom.ground(i);
    return c.y - R * 1.2 < y1 && g.y + R * (1 + BASE_DEPTH + 0.3) > y0;
  };

  // 地図の外へ落ちる影（地図の端と、低い所）
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].seen || !inRange(i)) continue;
    const g = geom.ground(i);
    poly(ctx, hexVerts(g.x + R * 0.1, g.y + R * (BASE_DEPTH + 0.12), R));
    ctx.fill();
  }

  // 行ごとの立つ物（足元の y の順）
  const byRow: SceneItem[][] = Array.from({ length: w.height }, () => []);
  for (const it of items) {
    const ext = itemExtent(it);
    const fy = Math.max(it.y, it.y2 ?? it.y);
    if (fy - ext.up > y1 || fy + ext.down < y0) continue;
    byRow[Math.floor(it.tile / w.width)].push(it);
  }

  for (let r = 0; r < w.height; r++) {
    for (let c = 0; c < w.width; c++) {
      const i = r * w.width + c;
      if (!tiles[i].seen || !inRange(i)) continue;
      paintTile(i);
    }
    for (const it of byRow[r]) drawItem(ctx, it);
  }
  ctx.restore();

  function paintTile(i: number) {
    const t = tiles[i];
    const lv = levels[i];
    const v = topVerts(geom, i, lv);
    const { x: cx, y: cy } = geom.center(i);
    const id = topId(i);
    const ter = getTerrain(t.t);
    // 崖（右下・左下の2面）。手前のマスが同じ高さなら、そのマスの上の面が隠す
    const d = (BASE_DEPTH + lv * LEVEL_STEP) * R;
    const dn = (p: V): V => [p[0], p[1] + d];
    poly(ctx, [v[2], v[3], v[4], dn(v[4]), dn(v[3]), dn(v[2])]);
    fillTerrain(t.t);
    poly(ctx, [v[3], v[4], dn(v[4]), dn(v[3])]);
    ctx.fillStyle = 'rgba(16,10,6,.45)';
    ctx.fill();
    poly(ctx, [v[2], v[3], dn(v[3]), dn(v[2])]);
    ctx.fillStyle = 'rgba(16,10,6,.62)';
    ctx.fill();
    // 崖の地層の線（水彩の上に墨で2本）
    ctx.strokeStyle = 'rgba(40,26,14,.35)';
    ctx.lineWidth = Math.max(0.6, R * 0.025);
    ctx.beginPath();
    for (const f of [0.45, 0.75]) {
      ctx.moveTo(v[2][0], v[2][1] + d * f);
      ctx.lineTo(v[3][0], v[3][1] + d * f);
      ctx.lineTo(v[4][0], v[4][1] + d * f);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dn(v[2])[0], dn(v[2])[1]);
    ctx.lineTo(dn(v[3])[0], dn(v[3])[1]);
    ctx.lineTo(dn(v[4])[0], dn(v[4])[1]);
    ctx.strokeStyle = 'rgba(20,12,6,.55)';
    ctx.lineWidth = Math.max(1, R * 0.04);
    ctx.stroke();

    // 上の面（模様の絵で塗る。すき間が出ないように、同じ模様で細くふちも塗る）
    poly(ctx, v);
    fillTerrain(id);
    if (ter.climate) {
      ctx.fillStyle = ter.climate.kind === 'cold' ? 'rgba(140,200,255,.16)' : 'rgba(255,120,40,.16)';
      ctx.fill();
    }
    if (t.t === 'forest') {
      ctx.fillStyle = 'rgba(10,30,8,.2)'; // 森の地面は少し暗く
      ctx.fill();
    }
    // にじみ・影・岸辺は、上の面の中だけに描く
    ctx.save();
    poly(ctx, v);
    ctx.clip();
    for (let k = 0; k < 6; k++) {
      const j = neighborAt(w, i, k);
      if (!seen(j)) continue;
      const a = v[k], b = v[(k + 1) % 6];
      // 違う地形の境目: 隣の地形の色を、境目にそって水彩のようににじませる（まっすぐな境目の線を消す）
      if (levels[j!] === lv && topId(j!) !== id && lv > 0) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = getTerrain(topId(j!)).color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = R * 0.42;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = R * 0.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // 奥（左上・左・右上）の高いマスが落とす影
      if ((k === 5 || k === 4 || k === 0) && levels[j!] > lv) {
        const f = Math.min(0.45, 0.22 * (levels[j!] - lv));
        poly(ctx, [a, b, [b[0] + (cx - b[0]) * f, b[1] + (cy - b[1]) * f], [a[0] + (cx - a[0]) * f, a[1] + (cy - a[1]) * f]]);
        ctx.fillStyle = 'rgba(0,0,0,.24)';
        ctx.fill();
      }
      // 岸辺（水のマスの、陸と接する辺）: 砂の帯と白い波の線
      if (lv === 0 && levels[j!] > 0) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(222,206,150,.85)';
        ctx.lineWidth = R * 0.24;
        ctx.stroke();
        const ia: V = [a[0] + (cx - a[0]) * 0.2, a[1] + (cy - a[1]) * 0.2];
        const ib: V = [b[0] + (cx - b[0]) * 0.2, b[1] + (cy - b[1]) * 0.2];
        const mm: V = [(ia[0] + ib[0]) / 2 + (cx - (a[0] + b[0]) / 2) * 0.06, (ia[1] + ib[1]) / 2 + (cy - (a[1] + b[1]) / 2) * 0.06];
        ctx.beginPath();
        ctx.moveTo(ia[0], ia[1]);
        ctx.quadraticCurveTo(mm[0], mm[1], ib[0], ib[1]);
        ctx.strokeStyle = 'rgba(240,250,255,.75)';
        ctx.lineWidth = Math.max(1, R * 0.05);
        ctx.stroke();
      }
    }
    ctx.restore();
    // 墨のふち: 隣が見えていない・高さが違う辺だけ（同じ高さの同じ地形の間には線を引かない）
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const j = neighborAt(w, i, k);
      if (seen(j) && levels[j!] >= lv) continue;
      ctx.moveTo(v[k][0], v[k][1]);
      ctx.lineTo(v[(k + 1) % 6][0], v[(k + 1) % 6][1]);
    }
    ctx.strokeStyle = 'rgba(30,20,10,.55)';
    ctx.lineWidth = Math.max(1, R * 0.035);
    ctx.lineCap = 'round';
    ctx.stroke();

    // 湖の氷（シナリオ2。滑って速く進む道）: つるつるの照り（どのマスも同じ向きの白い筋）と、細いひび
    if (t.t === 'lakeIce') {
      const hsh = (s: number) => hash01(i, s);
      ctx.lineCap = 'round';
      // 白い照り: 右上がりの筋を2〜3本（長さと場所だけマスごとに変える）
      const n = 2 + (hsh(130) < 0.5 ? 1 : 0);
      for (let q = 0; q < n; q++) {
        const sx = cx + (hash01(i * 4 + q, 131) - 0.5) * R * 0.9;
        const sy = cy + (hash01(i * 4 + q, 132) - 0.5) * R * 0.7;
        const len = R * (0.28 + hash01(i * 4 + q, 133) * 0.3);
        ctx.beginPath();
        ctx.moveTo(sx - len * 0.5, sy + len * 0.2);
        ctx.lineTo(sx + len * 0.5, sy - len * 0.2);
        ctx.strokeStyle = q === 0 ? 'rgba(255,255,255,.75)' : 'rgba(240,250,255,.45)';
        ctx.lineWidth = Math.max(1, R * (q === 0 ? 0.06 : 0.035));
        ctx.stroke();
      }
      // 細いひび（3マスに1つくらい。枝が1本）
      if (hsh(134) < 0.36) {
        const sx = cx + (hsh(135) - 0.5) * R * 0.7, sy = cy + (hsh(136) - 0.3) * R * 0.5;
        const ang = hsh(137) * Math.PI;
        const dx = Math.cos(ang) * R * 0.26, dy = Math.sin(ang) * R * 0.14;
        ctx.beginPath();
        ctx.moveTo(sx - dx, sy - dy);
        ctx.lineTo(sx + dx * 0.1, sy + dy * 0.3);
        ctx.lineTo(sx + dx, sy + dy);
        ctx.moveTo(sx + dx * 0.1, sy + dy * 0.3);
        ctx.lineTo(sx + dx * 0.1 - dy * 0.9, sy + dy * 0.3 + dx * 0.35);
        ctx.strokeStyle = 'rgba(52,96,132,.55)';
        ctx.lineWidth = Math.max(0.7, R * 0.025);
        ctx.stroke();
      }
    }

    // 川（見た目だけ）: 墨のふち → 水の色 → 光の線
    const rk = rivers.get(i);
    const wob = (hash01(i, 95) - 0.5) * R * 0.3;
    if (rk) {
      ctx.lineCap = 'round';
      flowPath(ctx, v, cx, cy, rk, wob);
      ctx.strokeStyle = 'rgba(30,50,70,.7)';
      ctx.lineWidth = R * 0.3;
      ctx.stroke();
      ctx.strokeStyle = '#5c9fd0';
      ctx.lineWidth = R * 0.22;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(220,240,255,.7)';
      ctx.lineWidth = Math.max(0.8, R * 0.04);
      ctx.setLineDash([R * 0.14, R * 0.2]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (rk.length === 1 || rk.length === 2) {
        // 水源（山のふもとの辺）は小さな泉
        const src = rk.find((k) => {
          const j = neighborAt(w, i, k);
          return j !== undefined && levels[j] === 2;
        });
        if (src !== undefined) {
          const p = mid(v, src);
          ctx.beginPath();
          ctx.ellipse(p[0] + (cx - p[0]) * 0.15, p[1] + (cy - p[1]) * 0.15, R * 0.2, R * 0.12, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#6aaee0';
          ctx.fill();
          ctx.strokeStyle = 'rgba(30,50,70,.7)';
          ctx.lineWidth = Math.max(0.8, R * 0.04);
          ctx.stroke();
        }
      }
    }
    // 街道（2026-11-14 オーナーの依頼で作り直し。「細い紐」に見えていた）:
    //   ① 地面を少し明るい土の色に ② 路肩（地面の色に土を混ぜた、幅の広い2本）③ 墨のふち ④ 土の本体（模様の絵）⑤ 敷石・小石・草
    //   行き止まりは先細りで草地に消える。町・施設のマスは、足元に小さな広場を敷く。分かれ道は真ん中を丸くつなぐ。
    // 色は不透明で重ねる（半透明を重ねると、つなぎ目に濃い継ぎ目が出る）。マスの辺の真ん中では平らに切る（butt）
    const ks = links.get(i);
    if (ks) {
      const ww = wob * 0.6;
      const xs = v.map((q) => q[0]), ys = v.map((q) => q[1]);
      const hx = (Math.max(...xs) - Math.min(...xs)) / 2, hy = (Math.max(...ys) - Math.min(...ys)) / 2;
      const ky = hy / R; // 地面の縦のつぶれ
      const grassy = ROAD_GRASSY.has(id);
      const base = getTerrain(id).color;
      // ① 人が行き交うマスの地面: 真ん中をほんのり明るい土・黄緑に
      const tint = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      tint.addColorStop(0, grassy ? 'rgba(226,214,138,.34)' : 'rgba(222,204,160,.26)');
      tint.addColorStop(0.55, grassy ? 'rgba(214,206,130,.2)' : 'rgba(214,196,150,.14)');
      tint.addColorStop(1, 'rgba(214,200,130,0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(hx * 0.98, hy * 0.92);
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const place = !!t.f;
      const taper = ks.length === 1 && !place;
      const segs: RoadSeg[] = ks.length === 2
        ? [{ a: mid(v, ks[0]), c: [cx + ww, cy + ww * 0.4], b: mid(v, ks[1]) }]
        : ks.map((k) => {
            const m = mid(v, k);
            return { a: m, c: [(m[0] + cx) / 2 + ww * 0.5, (m[1] + cy) / 2] as V, b: [cx, cy] as V };
          });
      // 広場（町・施設の足元）と、分かれ道の真ん中の丸
      const hubR = place ? R * 0.6 : ks.length > 2 ? R * 0.27 : 0;
      const hubK = place ? ky : 0.86;
      const hubY = cy + (place ? R * 0.1 * ky : 0);
      /** 先細りの幅（u = 0 がマスの辺、1 が真ん中） */
      const thin = (wd: number) => (u: number) => wd * Math.max(0, 1 - Math.pow(u, 2.2)) * (0.55 + 0.45 * (1 - u));
      /** 道の線を1本描く（先細りの時は帯を塗る） */
      const line = (sg: RoadSeg, wd: number) => {
        if (taper) {
          ribbon(ctx, sg, thin(wd));
          ctx.fill();
          return;
        }
        ctx.lineWidth = wd;
        ctx.beginPath();
        ctx.moveTo(sg.a[0], sg.a[1]);
        ctx.quadraticCurveTo(sg.c[0], sg.c[1], sg.b[0], sg.b[1]);
        ctx.stroke();
      };
      const hub = (grow: number) => {
        if (!hubR) return;
        ctx.beginPath();
        ctx.ellipse(cx, hubY, hubR + grow, (hubR + grow) * hubK, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      /** 1つの層: 道の線（幅 wd）と、真ん中の丸（半径を grow だけ広げる）を同じ色で塗る */
      const layer = (wd: number, grow: number, fill: string) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = fill;
        for (const sg of segs) line(sg, wd);
        hub(grow);
      };
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      // ② 路肩: 地面の色に土の色を混ぜる（外は薄く、内は濃く。草地と道の境目がぱきっと割れない）
      layer(R * 0.8, R * 0.17, mixHex(base, ROAD_SHOULDER, 0.2));
      layer(R * 0.66, R * 0.1, mixHex(base, ROAD_SHOULDER, 0.42));
      // ③ 墨のふち
      layer(R * 0.53, R * 0.035, ROAD_EDGE);
      // ④ 土の本体: 下の色を敷いてから、模様の絵（わだち）を道の向きに合わせて重ねる
      layer(R * 0.46, 0, ROAD_SOIL);
      for (const sg of segs) {
        const pat = roadPattern(ctx, R, Math.atan2(sg.b[1] - sg.a[1], sg.b[0] - sg.a[0]), cx, cy);
        if (!pat) break;
        ctx.strokeStyle = pat;
        ctx.fillStyle = pat;
        line(sg, R * 0.46);
      }
      if (hubR) {
        const pat = roadPattern(ctx, R, Math.PI / 2, cx, cy);
        if (pat) {
          ctx.fillStyle = pat;
          hub(0);
        }
      }
      // ⑤ 敷石・小石（道の両はしに沿って）と、路肩の草。場所はマスの番号から決める（毎回同じ）
      const ink = 'rgba(58,40,20,.75)';
      segs.forEach((sg, si) => {
        const n = ks.length === 2 ? 7 : 4;
        for (let q = 0; q < n; q++) {
          const hsh = (salt: number) => hash01(i * 64 + si * 8 + q, salt);
          const u = (q + 0.2 + hsh(110) * 0.6) / n;
          if (taper && u > 0.62) continue;
          const [px, py] = quadAt(sg, u);
          const [nx, ny] = quadNormal(sg, u);
          const side = q % 2 ? 1 : -1;
          const off = R * (0.13 + hsh(111) * 0.07) * side;
          const rr = R * (0.028 + hsh(112) * 0.03);
          ctx.lineWidth = Math.max(0.6, R * 0.022);
          ctx.beginPath();
          ctx.ellipse(px + nx * off, py + ny * off, rr * 1.35, rr * 0.9, hsh(113) * Math.PI, 0, Math.PI * 2);
          ctx.fillStyle = hsh(114) < 0.5 ? '#e6d6b0' : hsh(114) < 0.8 ? '#b8ab94' : '#9c8a6c';
          ctx.fill();
          ctx.strokeStyle = ink;
          ctx.stroke();
          // 路肩の草（草の生える地形だけ。3本の短い線）
          if (grassy && hsh(115) < 0.55) {
            const gx = px - nx * R * 0.29 * side, gy = py - ny * R * 0.29 * side;
            ctx.strokeStyle = hsh(116) < 0.5 ? '#4f7a34' : '#6d9440';
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (const dx of [-0.045, 0, 0.045]) {
              ctx.moveTo(gx + dx * R * 0.6, gy);
              ctx.lineTo(gx + dx * R, gy - R * (0.075 + (dx === 0 ? 0.03 : 0)));
            }
            ctx.stroke();
            ctx.lineCap = 'butt';
          }
        }
      });
      if (taper) {
        // 行き止まり: 道の先に、踏み跡の土が点々と残って草地に消える
        const sg = segs[0];
        const [tx, ty] = quadTangent(sg, 1);
        for (let q = 0; q < 4; q++) {
          const u = 0.8 + q * 0.11;
          const [px, py] = quadAt(sg, Math.min(1, u));
          const ext = Math.max(0, u - 1) * R * 0.9;
          ctx.beginPath();
          ctx.ellipse(px + tx * ext + (hash01(i * 8 + q, 117) - 0.5) * R * 0.14, py + ty * ext + (hash01(i * 8 + q, 118) - 0.5) * R * 0.08, R * (0.07 - q * 0.012), R * (0.045 - q * 0.008), 0, 0, Math.PI * 2);
          ctx.fillStyle = mixHex(base, ROAD_SOIL, 0.75 - q * 0.15);
          ctx.fill();
        }
      }
      if (place) {
        // 広場の敷石（ふちに沿って丸く並べる）
        ctx.lineWidth = Math.max(0.6, R * 0.022);
        for (let q = 0; q < 10; q++) {
          const ang = (q / 10) * Math.PI * 2 + hash01(i, 119) * 0.6;
          const rad = hubR * (0.8 + hash01(i * 16 + q, 120) * 0.1);
          const rr = R * (0.034 + hash01(i * 16 + q, 121) * 0.022);
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(ang) * rad, hubY + Math.sin(ang) * rad * ky, rr * 1.4, rr * 0.9, ang, 0, Math.PI * 2);
          ctx.fillStyle = hash01(i * 16 + q, 122) < 0.6 ? '#e6d6b0' : '#b8ab94';
          ctx.fill();
          ctx.strokeStyle = ink;
          ctx.stroke();
        }
      }
      // 川と交わる所は橋
      if (rk) {
        const a = mid(v, ks[0]);
        const ang = Math.atan2(a[1] - cy, a[0] - cx);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.fillStyle = '#9a6a3a';
        ctx.strokeStyle = 'rgba(30,18,8,.85)';
        ctx.lineWidth = Math.max(0.8, R * 0.035);
        ctx.fillRect(-R * 0.28, -R * 0.17, R * 0.56, R * 0.34);
        ctx.strokeRect(-R * 0.28, -R * 0.17, R * 0.56, R * 0.34);
        ctx.beginPath();
        for (let s = -2; s <= 2; s++) {
          ctx.moveTo(s * R * 0.11, -R * 0.17);
          ctx.lineTo(s * R * 0.11, R * 0.17);
        }
        ctx.stroke();
        ctx.lineWidth = Math.max(1, R * 0.05);
        ctx.beginPath();
        ctx.moveTo(-R * 0.3, -R * 0.2);
        ctx.lineTo(R * 0.3, -R * 0.2);
        ctx.moveTo(-R * 0.3, R * 0.2);
        ctx.lineTo(R * 0.3, R * 0.2);
        ctx.stroke();
        ctx.restore();
      }
    }
    // 地域の境目（隣が別の地域の辺に、やわらかい光の点線）
    ctx.beginPath();
    let any = false;
    for (let k = 0; k < 6; k++) {
      const j = neighborAt(w, i, k);
      if (j === undefined || tiles[j].r === t.r) continue;
      ctx.moveTo(v[k][0], v[k][1]);
      ctx.lineTo(v[(k + 1) % 6][0], v[(k + 1) % 6][1]);
      any = true;
    }
    if (any) {
      ctx.strokeStyle = 'rgba(255,236,190,.5)';
      ctx.lineWidth = Math.max(1.5, R * 0.06);
      ctx.setLineDash([R * 0.14, R * 0.12]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
