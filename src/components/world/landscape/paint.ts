// ===== 景色の層を Canvas に描く（docs/tasks/diorama-design.md ④「景色の層の作り」） =====
// 行ごとに奥から手前へ: その行の地面（崖・上の面・にじみ・岸辺・川・道・地域の境目）→ その行の立つ物（足元の y の順）。
// 手前の行の地面が、奥の行の木や峰の足元を少し隠すので、地面から生えて見える。
import { artImage } from '../../../art';
import { getTerrain } from '../../../data/world';
import type { WorldState } from '../../../types';
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
}

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

/** 地形の模様（描いた絵を R*4 の大きさで敷く）。絵がまだ読み込まれていなければ色だけ */
function terrainPattern(ctx: CanvasRenderingContext2D, id: string, R: number, cache: Map<string, CanvasPattern | null>): CanvasPattern | null {
  if (cache.has(id)) return cache.get(id)!;
  const img = loadedImage(artImage(`terrain/${id}`));
  let p: CanvasPattern | null = null;
  if (img) {
    p = ctx.createPattern(img, 'repeat');
    if (p && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scaleSelf((R * 4) / img.naturalWidth, (R * 4) / img.naturalHeight));
  }
  cache.set(id, p);
  return p;
}

/**
 * 地図の [y0, y1) の帯を描く。origin = この Canvas の上の端の地図の y（ctx は、もう画素の倍率をかけてある）。
 * 帯の外にはみ出す物は、呼ぶ側が帯で切り抜く
 */
export function paintRange(ctx: CanvasRenderingContext2D, inp: PaintInput, y0: number, y1: number, origin = y0) {
  const { w, tiles, geom, levels, links, rivers, under, roadTerrain, items } = inp;
  const { R } = geom;
  ctx.save();
  ctx.translate(0, -origin);
  const pats = new Map<string, CanvasPattern | null>();
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
    // 道（3本の線: 影・土・わだち）
    const ks = links.get(i);
    if (ks) {
      ctx.lineCap = 'round';
      flowPath(ctx, v, cx, cy, ks, wob * 0.6);
      ctx.strokeStyle = 'rgba(58,42,20,.55)';
      ctx.lineWidth = R * 0.34;
      ctx.stroke();
      ctx.strokeStyle = '#b8945c';
      ctx.lineWidth = R * 0.24;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(216,188,132,.8)';
      ctx.lineWidth = Math.max(0.8, R * 0.06);
      ctx.setLineDash([R * 0.12, R * 0.16]);
      ctx.stroke();
      ctx.setLineDash([]);
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
