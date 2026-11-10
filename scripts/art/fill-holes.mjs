// 背景の切り抜き（rembg）で、体の中の白っぽい所まで透明になって「穴」があいた絵を直す道具。
// build_art.py と同じ手順（ごみ取り → 余白を切る → 置く → ふちの影 → 保存）を Node + ffmpeg でやり直す。
// その前に「穴埋め」を入れる: 絵の外側（ふち）とつながっていない透明な所を、元画像の色で不透明に戻す。
//
//   node scripts/art/fill-holes.mjs [--src 元画像のフォルダ] [--cache 切り抜きのフォルダ] [--dry] [名前の一部…]
//     既定: --src C:/dev/card-rpg-assets/j4  --cache <src>/.cut
//     名前の例: pet-budgie-blue  bishop-female   （何も書かないと、cache に有る物を全部）
//   --dry  書き出さずに、穴の数だけ表示する
//
// 穴埋めの決まり:
//   - 透明（不透明度 128 未満）で、絵のふちとつながっていない所（= 体に囲まれた所）が「穴」。
//   - お供: 穴は全部埋める（腕の輪のような、本当に背景が見える隙間は無いため）。
//   - 主人公: 元画像のその所の色が、四隅の背景の色と平均で 18 より違う時だけ埋める
//     （背景と同じ色なら、腕と体の間などの本当の隙間なので透明のまま）。
//   - 穴のまわり 2px も、元画像の色で不透明にする（ふちの暗い線が残らないように）。
//   - 体の内側で「半分すけている」所（お腹など）も、外側から 8px 以上離れていれば不透明に戻す。
//     主人公は、元画像の色が背景より暗くない所（白っぽい服）だけ（床の影まで濃くならないように）
//     （3〜8px の所は少しずつ。輪郭のなめらかさはそのまま）。
//   - ふちの影（rim）は、穴埋めの後に付けるので、外側の輪郭にだけ付く。
// 必要な物: Node と ffmpeg（ffprobe）だけ。Python の PIL・opencv は使わない。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'src', 'assets', 'art');

// ---------- 読み書き ----------
export function decode(f) {
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f])
    .toString().trim().split(',').map(Number);
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 29 });
  return { w, h, d: new Uint8ClampedArray(buf.buffer, buf.byteOffset, buf.length) };
}
function encodeWebp(im, file, q) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${im.w}x${im.h}`, '-i', '-',
    '-c:v', 'libwebp', '-lossless', '0', '-quality', String(q), '-compression_level', '6', '-pix_fmt', 'yuva420p', '-frames:v', '1', file],
  { input: Buffer.from(im.d.buffer, im.d.byteOffset, im.d.length) });
}
const blank = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });
// Python の round（偶数への丸め）と同じにする
const pyRound = (x) => { const f = Math.floor(x), r = x - f; if (r > 0.5) return f + 1; if (r < 0.5) return f; return f % 2 === 0 ? f : f + 1; };

// ---------- 穴埋め ----------
export function findHoles(im, low = 128) {
  const { w, h, d } = im, n = w * h;
  const lowM = new Uint8Array(n), seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (d[i * 4 + 3] < low) lowM[i] = 1;
  const st = [];
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
  while (st.length) {
    const i = st.pop();
    if (!lowM[i] || seen[i]) continue;
    seen[i] = 1;
    const x = i % w;
    if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1);
    if (i >= w) st.push(i - w); if (i < n - w) st.push(i + w);
  }
  const comps = [];
  for (let i = 0; i < n; i++) {
    if (!lowM[i] || seen[i]) continue;
    const px = [], q = [i]; seen[i] = 2;
    while (q.length) {
      const j = q.pop(); px.push(j);
      const x = j % w;
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j >= w ? j - w : -1, j < n - w ? j + w : -1])
        if (k >= 0 && lowM[k] && !seen[k]) { seen[k] = 2; q.push(k); }
    }
    comps.push(px);
  }
  return comps;
}

export function fillHoles(cut, orig, { always = false, raise = always ? 'all' : 'light', th = 18, grow = 2, edge = 3, solid = 8 } = {}) {
  const { w, h } = cut, n = w * h, o = orig.d;
  const bg = [0, 1, 2].map((k) => [[4, 4], [w - 5, 4], [4, h - 5], [w - 5, h - 5]].reduce((s, [x, y]) => s + o[(y * w + x) * 4 + k], 0) / 4);
  const mask = new Uint8Array(n);
  let filled = 0, kept = 0;
  for (const px of findHoles(cut)) {
    let dev = 0;
    for (const j of px) dev += Math.abs(o[j * 4] - bg[0]) + Math.abs(o[j * 4 + 1] - bg[1]) + Math.abs(o[j * 4 + 2] - bg[2]);
    if (always || dev / px.length > th) { for (const j of px) mask[j] = 1; filled += px.length; } else kept += px.length;
  }
  // 穴のまわり grow px も埋める（正方形に広げる）
  let m = mask;
  for (let g = 0; g < grow; g++) {
    const m2 = m.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (m[i]) continue;
      for (let dy = -1; dy <= 1 && !m2[i]; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[yy * w + xx]) { m2[i] = 1; break; }
      }
    }
    m = m2;
  }
  // 半分すけている所: 外側（ふちとつながった透明な所と、残した隙間）から離れた所は、不透明に戻す。
  // 外側から edge px までは元のまま（輪郭のなめらかさ）、そこから solid px までで少しずつ不透明にする
  const out = outsideMask(cut, mask);
  const dist = chamfer(out, w, h);
  const res = { w, h, d: cut.d.slice() };
  let raised = 0;
  const bgLum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
  for (let i = 0; i < n; i++) {
    const old = res.d[i * 4 + 3];
    let a = old;
    if (m[i]) a = 255;
    else if (raise && !out[i] && old < 255 && (raise === 'all' || lum(o, i) >= 0.75 * bgLum)) {
      const t = (dist[i] - edge) / (solid - edge);
      if (t > 0) a = Math.max(old, Math.round(255 * Math.min(1, t)));
    }
    if (a === old) continue;
    // rembg の出力は不透明度で暗くなっているので、色は元画像から取る
    res.d[i * 4] = o[i * 4]; res.d[i * 4 + 1] = o[i * 4 + 1]; res.d[i * 4 + 2] = o[i * 4 + 2]; res.d[i * 4 + 3] = a;
    if (!m[i]) raised++;
  }
  return { im: res, filled, kept, raised };
}

const lum = (d, i) => 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
// 外側: ふちとつながった透明な所 + 埋めなかった穴（本当の隙間）
function outsideMask(cut, filledMask, low = 128) {
  const { w, h, d } = cut, n = w * h, lowM = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (d[i * 4 + 3] < low && !filledMask[i]) lowM[i] = 1;
  return lowM;
}
// 外側からの距離（3-4 の近似。単位は px）
function chamfer(out, w, h) {
  const n = w * h, D = new Float32Array(n);
  for (let i = 0; i < n; i++) D[i] = out[i] ? 0 : 1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; let v = D[i];
    if (x > 0) v = Math.min(v, D[i - 1] + 3);
    if (y > 0) { v = Math.min(v, D[i - w] + 3); if (x > 0) v = Math.min(v, D[i - w - 1] + 4); if (x < w - 1) v = Math.min(v, D[i - w + 1] + 4); }
    D[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x; let v = D[i];
    if (x < w - 1) v = Math.min(v, D[i + 1] + 3);
    if (y < h - 1) { v = Math.min(v, D[i + w] + 3); if (x < w - 1) v = Math.min(v, D[i + w + 1] + 4); if (x > 0) v = Math.min(v, D[i + w - 1] + 4); }
    D[i] = v;
  }
  for (let i = 0; i < n; i++) D[i] /= 3;
  return D;
}

// ---------- build_art.py と同じ手順 ----------
function despeckle(im, keep = 0.02, th = 24, mband = 0.18) {
  const { w, h, d } = im, n = w * h;
  const lab = new Int32Array(n); const stats = [null];
  for (let i = 0; i < n; i++) {
    if (d[i * 4 + 3] <= th || lab[i]) continue;
    const id = stats.length; let x0 = w, x1 = 0, y0 = h, y1 = 0, area = 0; const q = [i]; lab[i] = id;
    while (q.length) {
      const j = q.pop(); area++;
      const x = j % w, y = (j / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx; if (!lab[k] && d[k * 4 + 3] > th) { lab[k] = id; q.push(k); }
      }
    }
    stats.push({ x: x0, y: y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1, area });
  }
  if (stats.length <= 2) return im;
  const big = Math.max(...stats.slice(1).map((s) => s.area));
  const drop = new Uint8Array(stats.length);
  for (let i = 1; i < stats.length; i++) {
    const { x, y, bw, bh, area } = stats[i];
    if (area >= big * keep) continue;
    const inner = x + bw > w * mband && x < w * (1 - mband) && y + bh > h * mband && y < h * (1 - mband);
    if (!inner) drop[i] = 1;
  }
  const res = { w, h, d: d.slice() };
  for (let i = 0; i < n; i++) if (lab[i] && drop[lab[i]]) res.d[i * 4 + 3] = 0;
  return res;
}
function trimBox(im, th = 10) {
  let x0 = im.w, y0 = im.h, x1 = -1, y1 = -1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) if (im.d[(y * im.w + x) * 4 + 3] > th) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1 + 1, y1 + 1];
}
function crop(im, [x0, y0, x1, y1]) {
  const w = x1 - x0, h = y1 - y0, r = blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = x + x0, sy = y + y0;
    if (sx < 0 || sy < 0 || sx >= im.w || sy >= im.h) continue;
    const s = (sy * im.w + sx) * 4, t = (y * w + x) * 4;
    for (let k = 0; k < 4; k++) r.d[t + k] = im.d[s + k];
  }
  return r;
}
const trim = (im, th = 10) => crop(im, trimBox(im, th));

// PIL の LANCZOS と同じ考え方（縮小の時は窓を広げる）。PIL と同じく、不透明度を掛けた色で計算する
function lanczos(x) { if (x === 0) return 1; if (x <= -3 || x >= 3) return 0; const p = Math.PI * x; return 3 * Math.sin(p) * Math.sin(p / 3) / (p * p); }
function weights(inN, outN) {
  const scale = inN / outN, fs = Math.max(scale, 1), sup = 3 * fs, res = [];
  for (let i = 0; i < outN; i++) {
    const c = (i + 0.5) * scale;
    const a = Math.max(0, Math.floor(c - sup)), b = Math.min(inN, Math.ceil(c + sup));
    const ws = []; let sum = 0;
    for (let j = a; j < b; j++) { const v = lanczos((j - c + 0.5) / fs); ws.push(v); sum += v; }
    res.push({ a, ws: ws.map((v) => v / sum) });
  }
  return res;
}
function resize(im, W, H) {
  const { w, h, d } = im;
  const pm = new Float32Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { const a = d[i * 4 + 3] / 255; pm[i * 4] = d[i * 4] * a; pm[i * 4 + 1] = d[i * 4 + 1] * a; pm[i * 4 + 2] = d[i * 4 + 2] * a; pm[i * 4 + 3] = d[i * 4 + 3]; }
  const wx = weights(w, W), tmp = new Float32Array(W * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
    const { a, ws } = wx[x]; const t = (y * W + x) * 4;
    for (let k = 0; k < ws.length; k++) { const s = (y * w + a + k) * 4, v = ws[k]; tmp[t] += pm[s] * v; tmp[t + 1] += pm[s + 1] * v; tmp[t + 2] += pm[s + 2] * v; tmp[t + 3] += pm[s + 3] * v; }
  }
  const wy = weights(h, H), r = blank(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const { a, ws } = wy[y]; let c0 = 0, c1 = 0, c2 = 0, c3 = 0;
    for (let k = 0; k < ws.length; k++) { const s = ((a + k) * W + x) * 4, v = ws[k]; c0 += tmp[s] * v; c1 += tmp[s + 1] * v; c2 += tmp[s + 2] * v; c3 += tmp[s + 3] * v; }
    const al = Math.min(255, Math.max(0, Math.round(c3))), t = (y * W + x) * 4;
    r.d[t + 3] = al;
    if (al > 0) { const f = 255 / al; r.d[t] = Math.round(c0 * f); r.d[t + 1] = Math.round(c1 * f); r.d[t + 2] = Math.round(c2 * f); }
  }
  return r;
}
// over で重ねる（PIL の alpha_composite と paste(f, pos, f) は、透明なキャンバスの上では同じ結果になる）
function over(dst, src, ox, oy) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const X = x + ox, Y = y + oy; if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
    const s = (y * src.w + x) * 4, t = (Y * dst.w + X) * 4;
    const sa = src.d[s + 3] / 255, da = dst.d[t + 3] / 255, oa = sa + da * (1 - sa);
    if (oa <= 0) continue;
    for (let k = 0; k < 3; k++) dst.d[t + k] = Math.round((src.d[s + k] * sa + dst.d[t + k] * da * (1 - sa)) / oa);
    dst.d[t + 3] = Math.round(oa * 255);
  }
}
function place(fig, W, H, fill = 0.96, bottom = 0.985) {
  const k = Math.min(W * 0.98 / fig.w, H * fill / fig.h);
  const f = resize(fig, Math.max(1, pyRound(fig.w * k)), Math.max(1, pyRound(fig.h * k)));
  const c = blank(W, H);
  over(c, f, pyRound(W / 2 - f.w / 2), pyRound(H * bottom - f.h));
  return c;
}
function square(fig, size, pad = 0.04) {
  const k = size * (1 - 2 * pad) / Math.max(fig.w, fig.h);
  const f = resize(fig, Math.max(1, pyRound(fig.w * k)), Math.max(1, pyRound(fig.h * k)));
  const c = blank(size, size);
  over(c, f, Math.floor((size - f.w) / 2), Math.floor((size - f.h) / 2));
  return c;
}
function rim(im, color, strength, r) {
  const { w, h, d } = im, n = w * h;
  const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = d[i * 4 + 3];
  // MaxFilter(2r+1)
  const mx = new Float32Array(n), mx2 = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) m = Math.max(m, a[y * w + xx]); } mx[y * w + x] = m; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let m = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) m = Math.max(m, mx[yy * w + x]); } mx2[y * w + x] = m; }
  // GaussianBlur(r): PIL の半径は標準偏差
  const R = Math.ceil(r * 3), ker = []; let s = 0;
  for (let k = -R; k <= R; k++) { const v = Math.exp(-k * k / (2 * r * r)); ker.push(v); s += v; }
  for (let i = 0; i < ker.length; i++) ker[i] /= s;
  const t1 = new Float32Array(n), bl = new Float32Array(n);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let k = -R; k <= R; k++) { const xx = Math.min(w - 1, Math.max(0, x + k)); v += mx2[y * w + xx] * ker[k + R]; } t1[y * w + x] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = 0; for (let k = -R; k <= R; k++) { const yy = Math.min(h - 1, Math.max(0, y + k)); v += t1[yy * w + x] * ker[k + R]; } bl[y * w + x] = v; }
  const g = blank(w, h);
  for (let i = 0; i < n; i++) { g.d[i * 4] = color[0]; g.d[i * 4 + 1] = color[1]; g.d[i * 4 + 2] = color[2]; g.d[i * 4 + 3] = Math.floor(Math.round(bl[i]) * strength); }
  over(g, im, 0, 0);
  return g;
}

// ---------- 主人公の顔の切り抜き（build_art.py の FACES と同じ値） ----------
const FACES = {
  'hadesLord-female': [0.543, 0.158, 0.157], 'hadesLord-male': [0.443, 0.136, 0.156],
  'necromancer-female': [0.421, 0.153, 0.156], 'necromancer-male': [0.571, 0.139, 0.155],
  'overlord-female': [0.598, 0.196, 0.156],
  'pope-female': [0.50, 0.172, 0.156], 'pope-male': [0.553, 0.178, 0.156],
  'lancer-female': [0.559, 0.168, 0.156], 'hexer-female': [0.535, 0.192, 0.156],
};
const FACE_DEFAULT = [0.5, 0.085, 0.17];
function bodyCenter(fig) {
  const { w, h, d } = fig; let s = 0, sx = 0;
  for (let y = Math.trunc(h * 0.35); y < h; y++) for (let x = 0; x < w; x++) { const a = d[(y * w + x) * 4 + 3]; s += a; sx += a * x; }
  return sx / Math.max(1, s);
}
function headCenter(fig, top = 0.03, bot = 0.12) {
  const { w, h, d } = fig, bc = bodyCenter(fig), col = new Array(w).fill(0);
  for (let y = Math.trunc(h * top); y < Math.trunc(h * bot); y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) col[x]++;
  let x0 = Math.trunc(bc), x1 = x0; const lim = Math.max(1, Math.max(...col) * 0.15);
  while (x0 > 0 && col[x0 - 1] > lim) x0--;
  while (x1 < w - 1 && col[x1 + 1] > lim) x1++;
  return (x0 + x1) / 2 / w;
}

// ---------- 1枚ずつ ----------
export function build(key, { srcDir, cacheDir, dry = false, outDir = OUT }) {
  const cutF = path.join(cacheDir, `${key}.png`);
  const origF = ['webp', 'png', 'jpg'].map((e) => path.join(srcDir, `${key}.${e}`)).find((f) => fs.existsSync(f));
  if (!origF) return { key, skip: '元画像が無い' };
  const cut = decode(cutF), orig = decode(origF);
  if (cut.w !== orig.w || cut.h !== orig.h) return { key, skip: '大きさが違う' };
  const pet = key.startsWith('pet-');
  const { im, filled, kept, raised } = fillHoles(cut, orig, { always: pet });
  if (dry) return { key, filled, kept, raised };
  if (pet) {
    const fig = trim(despeckle(im), 24);
    encodeWebp(rim(square(fig, 160, 0.04), [8, 6, 12], 0.6, 2), path.join(outDir, 'pet', `${key.slice(4)}.webp`), 82);
  } else {
    const fig = trim(despeckle(im));
    encodeWebp(rim(place(fig, 480, 660), [8, 6, 12], 0.75, 2), path.join(outDir, 'hero', `${key}.webp`), 80);
    let [fx, fy, fs] = FACES[key] || FACE_DEFAULT;
    if (fx === 0.5) fx = headCenter(fig);
    const s = fs * fig.h, cx = fx * fig.w, cy = fy * fig.h;
    const face = resize(crop(fig, [pyRound(cx - s / 2), pyRound(cy - s / 2), pyRound(cx + s / 2), pyRound(cy + s / 2)]), 192, 192);
    encodeWebp(face, path.join(outDir, 'hero', `${key}-face.webp`), 82);
  }
  return { key, filled, kept, raised };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k, def) => { const i = args.indexOf(k); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
  const srcDir = opt('--src', 'C:/dev/card-rpg-assets/j4');
  const cacheDir = opt('--cache', path.join(srcDir, '.cut'));
  const outDir = opt('--out', OUT);
  const dry = args.includes('--dry'); const only = args.filter((a) => a !== '--dry');
  const keys = fs.readdirSync(cacheDir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4))
    .filter((k) => !only.length || only.some((o) => k.includes(o)));
  for (const k of keys) {
    const r = build(k, { srcDir, cacheDir, dry, outDir });
    console.log(r.skip ? `${k}: 飛ばした（${r.skip}）` : `${k}: 埋めた ${r.filled}px / 隙間として残した ${r.kept}px / 半透明を戻した ${r.raised}px`);
  }
}
