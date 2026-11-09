// ===== 景色の立つ物の絵（仮の絵をプログラムで描く。絵が来たら差し替わる） =====
// 絵（ChatGPT で作る透明背景の1つの物の絵）を src/assets/art/scenery/<種類>.webp（またはその後ろに -1, -2 … を付けた複数枚）に置くと、
// その絵を足元（下の真ん中）に合わせて描く。無い間は、墨線＋淡い水彩ふうの図をここで描く。
// 光は左上から。影は足元の楕円だけ（プログラムで描く）。
import { artImage } from '../../../art';
import { artImageIds } from '../../../art/images';
import { hash01 } from '../diorama';
import type { ItemKind, SceneItem } from './scatter';

const INK = 'rgba(34,24,16,.85)';

// ---- 描いた絵（画像）の読み込み。読み込めたら、知らせを受けた景色の層が描き直す ----
const images = new Map<string, HTMLImageElement | null>();
const listeners = new Set<() => void>();
export function onImagesLoaded(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
/** 絵（読み込み済みなら画像、まだなら読み込みを始めて undefined） */
export function loadedImage(url: string | undefined): HTMLImageElement | undefined {
  if (!url) return undefined;
  const got = images.get(url);
  if (got) return got.complete && got.naturalWidth ? got : undefined;
  if (got === null) return undefined;
  if (typeof Image === 'undefined') return undefined;
  const img = new Image();
  img.decoding = 'async';
  images.set(url, img);
  img.onload = () => listeners.forEach((fn) => fn());
  img.onerror = () => images.set(url, null);
  img.src = url;
  return undefined;
}

/** その種類の描いた絵（複数あれば v で選ぶ） */
function sceneryImage(k: ItemKind, v: number): HTMLImageElement | undefined {
  const ids = artImageIds('scenery').filter((id) => id === k || id.startsWith(`${k}-`));
  if (!ids.length) return undefined;
  return loadedImage(artImage(`scenery/${ids[Math.floor(v * ids.length) % ids.length]}`));
}

/** 足元の影（地面に落ちる楕円） */
function footShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.32) {
  ctx.fillStyle = `rgba(10,8,4,${a})`;
  ctx.beginPath();
  ctx.ellipse(x + rx * 0.18, y + ry * 0.2, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 左上から光が当たる水彩の塗り（明るい色 → 暗い色） */
function wash(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, light: string, dark: string) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  return g;
}

function stroke(ctx: CanvasRenderingContext2D, w: number) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** 針葉樹（3段の三角）。snow = 雪をかぶる */
function pine(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number, snow: boolean) {
  const w = h * (0.52 + v * 0.1);
  footShadow(ctx, x, y, w * 0.42, w * 0.14);
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(x - h * 0.035, y - h * 0.18, h * 0.07, h * 0.18);
  const dark = v < 0.5 ? '#1f4a2a' : '#25502c';
  for (let t = 0; t < 3; t++) {
    const top = y - h * (0.45 + t * 0.2) - h * 0.15;
    const bot = y - h * (0.12 + t * 0.2);
    const half = (w / 2) * (1 - t * 0.24);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.quadraticCurveTo(x + half * 0.5, (top + bot) / 2, x + half, bot);
    ctx.quadraticCurveTo(x, bot + h * 0.04, x - half, bot);
    ctx.quadraticCurveTo(x - half * 0.5, (top + bot) / 2, x, top);
    ctx.fillStyle = wash(ctx, x - half, top, x + half, bot, snow ? '#6a9a7a' : '#5c9a4a', dark);
    ctx.fill();
    stroke(ctx, Math.max(0.8, h * 0.035));
    if (snow) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + half * 0.45, top + (bot - top) * 0.42);
      ctx.lineTo(x - half * 0.45, top + (bot - top) * 0.42);
      ctx.closePath();
      ctx.fillStyle = 'rgba(240,248,255,.9)';
      ctx.fill();
    }
  }
}

/** 広葉樹（丸い葉のかたまり） */
function broadleaf(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number) {
  const r = h * 0.27;
  footShadow(ctx, x, y, r * 1.1, r * 0.36);
  ctx.fillStyle = '#5a3a22';
  ctx.beginPath();
  ctx.moveTo(x - h * 0.04, y);
  ctx.lineTo(x - h * 0.025, y - h * 0.4);
  ctx.lineTo(x + h * 0.025, y - h * 0.4);
  ctx.lineTo(x + h * 0.04, y);
  ctx.fill();
  const cy = y - h * 0.62;
  const blobs: [number, number, number][] = [
    [-0.55, 0.25, 0.75],
    [0.55, 0.22, 0.72],
    [0, -0.25, 0.9],
    [0, 0.3, 0.8],
  ];
  ctx.beginPath();
  for (const [dx, dy, k] of blobs) {
    ctx.moveTo(x + dx * r + r * k, cy + dy * r);
    ctx.arc(x + dx * r, cy + dy * r, r * k, 0, Math.PI * 2);
  }
  // 墨のふちは外側だけ（太く描いてから塗るので、葉のかたまりの中の円の線は消える）
  stroke(ctx, Math.max(1.6, h * 0.06));
  ctx.fillStyle = wash(ctx, x - r, cy - r, x + r, cy + r, v < 0.5 ? '#86b85a' : '#7aac56', v < 0.5 ? '#2f5a26' : '#2a5222');
  ctx.fill();
  // 葉の明るい所
  ctx.fillStyle = 'rgba(220,240,170,.35)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, cy - r * 0.45, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

/** 枯れ木（墨の線の枝） */
function deadTree(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number) {
  footShadow(ctx, x, y, h * 0.2, h * 0.06);
  ctx.strokeStyle = '#3a2a30';
  ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.07;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + h * 0.06 * (v - 0.5), y - h * 0.5, x + h * 0.05, y - h * 0.85);
  ctx.stroke();
  ctx.lineWidth = h * 0.035;
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.45);
  ctx.lineTo(x - h * 0.25, y - h * 0.7);
  ctx.moveTo(x + h * 0.02, y - h * 0.6);
  ctx.lineTo(x + h * 0.26, y - h * 0.82);
  ctx.moveTo(x - h * 0.15, y - h * 0.6);
  ctx.lineTo(x - h * 0.2, y - h * 0.82);
  ctx.stroke();
}

/** 山の形（峰）の頂点。v で形を変える */
function peakShape(x: number, y: number, h: number, v: number): [number, number][] {
  const w = h * (0.78 + v * 0.2);
  const tx = x + (v - 0.5) * w * 0.2;
  return [
    [x - w / 2, y],
    [x - w * 0.3, y - h * 0.42],
    [x - w * 0.16, y - h * 0.58],
    [tx, y - h],
    [x + w * 0.12, y - h * 0.72],
    [x + w * 0.22, y - h * 0.62],
    [x + w * 0.36, y - h * 0.3],
    [x + w / 2, y],
  ];
}

function peak(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number, volcano = false) {
  const p = peakShape(x, y, h, v);
  const w = p[7][0] - p[0][0];
  footShadow(ctx, x, y, w * 0.5, w * 0.12, 0.38);
  const top = p[3];
  // 山の形（光の当たる左と、影の右）
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]);
  ctx.closePath();
  ctx.fillStyle = wash(ctx, p[0][0], top[1], p[7][0], y, volcano ? '#8a6a5a' : '#a8a0a8', volcano ? '#3a2422' : '#4a4450');
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 右の影の面
  ctx.beginPath();
  ctx.moveTo(top[0], top[1]);
  ctx.lineTo(top[0] + w * 0.06, y);
  ctx.lineTo(p[7][0], y);
  ctx.lineTo(p[6][0], p[6][1]);
  ctx.closePath();
  ctx.fillStyle = 'rgba(30,20,40,.32)';
  ctx.fill();
  // 足元の草の色（山すそ）
  ctx.fillStyle = volcano ? 'rgba(60,20,10,.35)' : 'rgba(70,100,50,.35)';
  ctx.fillRect(p[0][0], y - h * 0.2, w, h * 0.2);
  if (!volcano) {
    // 雪の帽子
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(top[0] + w * 0.16, top[1] + h * 0.26);
    ctx.lineTo(top[0] + w * 0.05, top[1] + h * 0.22);
    ctx.lineTo(top[0] - w * 0.04, top[1] + h * 0.3);
    ctx.lineTo(top[0] - w * 0.13, top[1] + h * 0.22);
    ctx.closePath();
    ctx.fillStyle = 'rgba(248,250,255,.95)';
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]);
  stroke(ctx, Math.max(1, h * 0.025));
  // 墨のしわ（尾根の線）
  ctx.beginPath();
  ctx.moveTo(top[0], top[1]);
  ctx.quadraticCurveTo(top[0] - w * 0.02, top[1] + h * 0.5, top[0] + w * 0.04, y - h * 0.05);
  ctx.strokeStyle = 'rgba(34,24,16,.4)';
  ctx.lineWidth = Math.max(0.8, h * 0.015);
  ctx.stroke();
  if (volcano) {
    // 火口の光
    ctx.fillStyle = '#ffb040';
    ctx.beginPath();
    ctx.ellipse(top[0], top[1] + h * 0.04, w * 0.08, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(top[0], top[1], 0, top[0], top[1], h * 0.45);
    g.addColorStop(0, 'rgba(255,140,40,.55)');
    g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(top[0] - h * 0.45, top[1] - h * 0.45, h * 0.9, h * 0.9);
  }
}

/** 尾根: 2つの峰の足元を結ぶ、低い山並み（墨線と、峰と同じ色の水彩） */
function ridge(ctx: CanvasRenderingContext2D, it: SceneItem) {
  const x1 = it.x, y1 = it.y, x2 = it.x2 ?? it.x, y2 = it.y2 ?? it.y;
  const h = it.h;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const n = 5;
  const top: [number, number][] = [];
  for (let s = 0; s <= n; s++) {
    const f = s / n;
    const bump = Math.sin(f * Math.PI) * (0.75 + hash01(Math.round(it.v * 1e6) + s, 80) * 0.35);
    top.push([x1 + (x2 - x1) * f, y1 + (y2 - y1) * f - h * bump]);
  }
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (const q of top) ctx.lineTo(q[0], q[1]);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.fillStyle = wash(ctx, Math.min(x1, x2), my - h, Math.max(x1, x2), my, '#9a94a0', '#4a4652');
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (const q of top.slice(1)) ctx.lineTo(q[0], q[1]);
  stroke(ctx, Math.max(1, h * 0.04));
  void mx;
}

/** 丘のふくらみ */
function hill(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number) {
  const w = h * 2.3;
  footShadow(ctx, x, y, w * 0.5, w * 0.1, 0.25);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w * 0.35, y - h * 1.2, x + w * 0.25 + v * w * 0.1, y - h * 1.25, x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = wash(ctx, x - w / 2, y - h, x + w / 2, y, '#b8c470', '#5a6a2a');
  ctx.fill();
  stroke(ctx, Math.max(0.8, h * 0.05));
  ctx.beginPath();
  ctx.moveTo(x - w * 0.1, y - h * 0.15);
  ctx.quadraticCurveTo(x + w * 0.05, y - h * 0.55, x + w * 0.22, y - h * 0.25);
  ctx.strokeStyle = 'rgba(34,24,16,.3)';
  ctx.lineWidth = Math.max(0.6, h * 0.04);
  ctx.stroke();
}

function rock(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number) {
  const w = h * 1.6;
  footShadow(ctx, x, y, w * 0.5, w * 0.14, 0.3);
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w * 0.36, y - h * 0.7);
  ctx.lineTo(x - w * 0.05 + v * w * 0.1, y - h);
  ctx.lineTo(x + w * 0.35, y - h * 0.62);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = wash(ctx, x - w / 2, y - h, x + w / 2, y, '#b0aaa0', '#5a544e');
  ctx.fill();
  stroke(ctx, Math.max(0.7, h * 0.07));
}

function grass(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number) {
  ctx.strokeStyle = v < 0.5 ? '#5a8a34' : '#6a9a3a';
  ctx.lineWidth = Math.max(0.8, h * 0.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let s = -2; s <= 2; s++) {
    ctx.moveTo(x + s * h * 0.18, y);
    ctx.quadraticCurveTo(x + s * h * 0.22, y - h * 0.5, x + s * h * 0.36, y - h * (0.8 + ((s + 2) % 2) * 0.2));
  }
  ctx.stroke();
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number) {
  grass(ctx, x, y, h * 0.8, v);
  const colors = ['#ffe9f0', '#ffd86a', '#ff9ab8', '#c8b0ff'];
  for (let s = 0; s < 3; s++) {
    ctx.fillStyle = colors[Math.floor(hash01(Math.round(v * 1e5) + s, 81) * colors.length)];
    ctx.beginPath();
    ctx.arc(x + (s - 1) * h * 0.4, y - h * (0.55 + (s % 2) * 0.25), Math.max(1, h * 0.13), 0, Math.PI * 2);
    ctx.fill();
  }
}

function reeds(ctx: CanvasRenderingContext2D, x: number, y: number, h: number) {
  ctx.fillStyle = 'rgba(40,60,50,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y, h * 0.7, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a8a4a';
  ctx.lineWidth = Math.max(0.8, h * 0.07);
  ctx.beginPath();
  for (let s = -2; s <= 2; s++) {
    ctx.moveTo(x + s * h * 0.15, y);
    ctx.lineTo(x + s * h * 0.2, y - h * (0.8 + (s & 1) * 0.25));
  }
  ctx.stroke();
}

function crystal(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number) {
  const g = ctx.createRadialGradient(x, y - h * 0.4, 0, x, y - h * 0.4, h * 0.9);
  g.addColorStop(0, 'rgba(200,120,255,.45)');
  g.addColorStop(1, 'rgba(160,60,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - h, y - h * 1.3, h * 2, h * 1.8);
  const shard = (dx: number, hh: number, lean: number) => {
    ctx.beginPath();
    ctx.moveTo(x + dx - hh * 0.16, y);
    ctx.lineTo(x + dx + lean - hh * 0.06, y - hh * 0.8);
    ctx.lineTo(x + dx + lean, y - hh);
    ctx.lineTo(x + dx + lean + hh * 0.08, y - hh * 0.78);
    ctx.lineTo(x + dx + hh * 0.16, y);
    ctx.closePath();
    ctx.fillStyle = wash(ctx, x + dx - hh * 0.2, y - hh, x + dx + hh * 0.2, y, '#e8b8ff', '#5a1a8a');
    ctx.fill();
    stroke(ctx, Math.max(0.7, hh * 0.04));
  };
  shard(-h * 0.22, h * 0.7, -h * 0.1);
  shard(h * 0.2, h * 0.6, h * 0.12);
  shard(0, h * (0.95 + v * 0.1), 0);
}

function crack(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, v: number) {
  ctx.strokeStyle = 'rgba(40,10,50,.75)';
  ctx.lineWidth = Math.max(1, h * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - h, y + h * 0.05);
  ctx.lineTo(x - h * 0.4, y - h * 0.12);
  ctx.lineTo(x, y + h * 0.08);
  ctx.lineTo(x + h * 0.5, y - h * 0.1 + v * h * 0.1);
  ctx.lineTo(x + h * 0.95, y + h * 0.05);
  ctx.moveTo(x - h * 0.4, y - h * 0.12);
  ctx.lineTo(x - h * 0.5, y - h * 0.3);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,110,255,.6)';
  ctx.lineWidth = Math.max(0.6, h * 0.03);
  ctx.stroke();
}

/** 立つ物を1つ描く（描いた絵があれば絵、無ければ仮の図） */
export function drawItem(ctx: CanvasRenderingContext2D, it: SceneItem) {
  const img = it.k === 'ridge' || it.k === 'crack' ? undefined : sceneryImage(it.k, it.v);
  if (img) {
    // 絵の高さを h に合わせる（峰・木は少し大きめに）。足元 = 絵の下の真ん中
    const hh = it.h * 1.15;
    const ww = (hh * img.naturalWidth) / img.naturalHeight;
    footShadow(ctx, it.x, it.y, ww * 0.36, ww * 0.1);
    ctx.drawImage(img, it.x - ww / 2, it.y - hh, ww, hh);
    return;
  }
  switch (it.k) {
    case 'pine':
      return pine(ctx, it.x, it.y, it.h, it.v, false);
    case 'snowPine':
      return pine(ctx, it.x, it.y, it.h, it.v, true);
    case 'broadleaf':
      return broadleaf(ctx, it.x, it.y, it.h, it.v);
    case 'deadTree':
      return deadTree(ctx, it.x, it.y, it.h, it.v);
    case 'peak':
      return peak(ctx, it.x, it.y, it.h, it.v);
    case 'volcano':
      return peak(ctx, it.x, it.y, it.h, it.v, true);
    case 'ridge':
      return ridge(ctx, it);
    case 'hill':
      return hill(ctx, it.x, it.y, it.h, it.v);
    case 'rock':
      return rock(ctx, it.x, it.y, it.h, it.v);
    case 'grass':
      return grass(ctx, it.x, it.y, it.h, it.v);
    case 'flower':
      return flower(ctx, it.x, it.y, it.h, it.v);
    case 'reeds':
      return reeds(ctx, it.x, it.y, it.h);
    case 'crystal':
      return crystal(ctx, it.x, it.y, it.h, it.v);
    case 'crack':
      return crack(ctx, it.x, it.y, it.h, it.v);
  }
}

/** 立つ物の上下の広がり（描き直す区切りを決める）。上 = 足元から上へ、下 = 足元から下へ */
export function itemExtent(it: SceneItem): { up: number; down: number } {
  if (it.k === 'ridge') return { up: it.h * 1.2 + Math.abs((it.y2 ?? it.y) - it.y), down: Math.abs((it.y2 ?? it.y) - it.y) + it.h * 0.2 };
  if (it.k === 'crystal') return { up: it.h * 1.4, down: it.h * 0.6 };
  return { up: it.h * 1.25, down: it.h * 0.3 };
}

/** 霧の向こうのシルエット（山・火山・最後の城）の SVG の形。足元 x, y・高さ h */
export function silhouettePath(kind: 'peak' | 'castle', x: number, y: number, h: number, v: number): string {
  const f = (n: number) => n.toFixed(1);
  const P = (q: [number, number][]) => 'M' + q.map(([a, b]) => `${f(a)} ${f(b)}`).join(' L') + ' Z';
  if (kind === 'peak') return P(peakShape(x, y, h, v));
  // 城: 中央の高い塔と左右の塔、とがった屋根
  const w = h * 0.9;
  const tower = (cx: number, tw: number, th: number) =>
    P([
      [cx - tw / 2, y],
      [cx - tw / 2, y - th],
      [cx, y - th - tw * 1.2],
      [cx + tw / 2, y - th],
      [cx + tw / 2, y],
    ]);
  return [
    P([
      [x - w / 2, y],
      [x - w / 2, y - h * 0.35],
      [x + w / 2, y - h * 0.35],
      [x + w / 2, y],
    ]),
    tower(x, w * 0.22, h * 0.7),
    tower(x - w * 0.34, w * 0.16, h * 0.5),
    tower(x + w * 0.34, w * 0.16, h * 0.5),
    tower(x - w * 0.15, w * 0.12, h * 0.55),
    tower(x + w * 0.16, w * 0.12, h * 0.58),
  ].join(' ');
}
