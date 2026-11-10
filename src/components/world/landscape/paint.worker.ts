// ===== 景色の層を、別のスレッド（Worker）で描く =====
// 霧が晴れるたびの描き直し（地面・木・峰を Canvas に描いて、画像にする）を、画面のスレッドから外す。
// 画面のスレッドは、できた画像（PNG）を img に入れるだけなので、駒が歩く動きが引っかからない。
// 描く中身は画面のスレッドと同じ関数（paint.ts・scatter.ts・sprites.ts）。乱数は使わない（ハッシュだけ）ので、同じ絵になる。
import type { WorldState } from '../../../types';
import { paintRange, type PaintGeom, type TerrainLook } from './paint';
import { scatter, type SceneItem } from './scatter';
import { setImageSource, type SceneImage } from './sprites';

/** 地図の、描き直しの間は変わらない部分（変わったら gen が増える） */
export interface StaticMsg {
  type: 'static';
  gen: number;
  width: number;
  height: number;
  /** マスの地形・地域・場所があるか（見えたかどうかは SeenMsg） */
  t: string[];
  r: number[];
  f: boolean[];
  R: number;
  hexW: number;
  W: number;
  H: number;
  /** マスの中心・床の位置（x, y の順に並べた数） */
  centers: Float64Array;
  grounds: Float64Array;
  levels: number[];
  links: Map<number, number[]>;
  rivers: Map<number, number[]>;
  under: string[];
  roadTerrain: string;
  noProp: number[];
  stage: number;
  terrains: TerrainLook;
  dpr: number;
  top: number;
  chunk: number;
}
export interface SeenMsg {
  type: 'seen';
  seen: Uint8Array;
}
export interface ImagesMsg {
  type: 'images';
  urls: string[];
}
export interface PaintMsg {
  type: 'paint';
  gen: number;
  k: number;
  seq: number;
  band?: [number, number];
}
export type ToWorker = StaticMsg | SeenMsg | ImagesMsg | PaintMsg;
export interface FromWorker {
  gen: number;
  k: number;
  seq: number;
  blob?: Blob;
  error?: string;
}

const host = self as unknown as { postMessage(m: FromWorker): void; onmessage: ((e: MessageEvent<ToWorker>) => void) | null; location: Location };

/** 絵の読み込みを諦めるまでの時間 */
const IMAGE_TIMEOUT_MS = 5000;
const norm = (url: string) => new URL(url, host.location.href).href;
const bitmaps = new Map<string, SceneImage>();
setImageSource((url) => bitmaps.get(norm(url)));

let st: StaticMsg | undefined;
let seen: Uint8Array = new Uint8Array(0);
let tiles: WorldState['tiles'] = [];
let items: SceneItem[] | undefined;
let geom: PaintGeom | undefined;
const chunks = new Map<number, OffscreenCanvas>();
/** 区切りごとの、まだ順番を待っている描く仕事の数（後に同じ区切りの仕事が来ているなら、画像にするのを省く） */
const queued = new Map<number, number>();

function rebuildTiles() {
  if (!st) return;
  const s = st;
  tiles = s.t.map((t, i) => ({ t, r: s.r[i], seen: !!seen[i], ...(s.f[i] ? { f: { kind: 'town', id: '' } } : {}) })) as unknown as WorldState['tiles'];
  items = undefined;
}

let dims: { W: number; dpr: number; chunk: number; top: number; gen: number } | undefined;

async function handle(m: ToWorker) {
  if (m.type === 'paint') queued.set(m.k, (queued.get(m.k) ?? 1) - 1);
  if (m.type === 'static') {
    st = m;
    const { centers, grounds } = m;
    geom = {
      R: m.R,
      hexW: m.hexW,
      W: m.W,
      H: m.H,
      center: (i) => ({ x: centers[i * 2], y: centers[i * 2 + 1] }),
      ground: (i) => ({ x: grounds[i * 2], y: grounds[i * 2 + 1] }),
    };
    // 大きさが変わった時だけ、描いた区切りを捨てる（道・川が変わっただけなら、晴れた帯の描き直しで足りる）
    if (!dims || dims.W !== m.W || dims.dpr !== m.dpr || dims.chunk !== m.chunk || dims.top !== m.top || dims.gen !== m.gen) chunks.clear();
    dims = { W: m.W, dpr: m.dpr, chunk: m.chunk, top: m.top, gen: m.gen };
    rebuildTiles();
    return;
  }
  if (m.type === 'seen') {
    seen = m.seen;
    rebuildTiles();
    return;
  }
  if (m.type === 'images') {
    // 画面のスレッドで読み込めた絵と同じ物を、ここでも読む（読み終わるまで、次の描く仕事は待つ）
    await Promise.all(
      m.urls.map(async (url) => {
        const key = norm(url);
        if (bitmaps.has(key)) return;
        // 通信が止まっても、描く仕事が全部止まらないように、5秒で諦める
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), IMAGE_TIMEOUT_MS);
        try {
          const res = await fetch(key, { signal: ctrl.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          clearTimeout(timer);
          bitmaps.set(key, await createImageBitmap(blob));
        } catch {
          clearTimeout(timer);
          // 読めない絵は、画面のスレッドの「絵が無い時」と同じく、仮の図で描く
        }
      }),
    );
    return;
  }
  if (!st || !geom || m.gen !== st.gen) return;
  const s = st;
  const g = geom;
  if (!items) {
    const noProp = new Set(s.noProp);
    items = scatter({ w: { width: s.width, height: s.height, tiles }, geom: g, levels: s.levels, links: s.links, rivers: s.rivers, stage: s.stage, blocked: (i) => s.f[i] || noProp.has(i) });
  }
  let cv = chunks.get(m.k);
  const full = !cv || !m.band;
  if (!cv) {
    cv = new OffscreenCanvas(Math.ceil(s.W * s.dpr), Math.ceil(s.chunk * s.dpr));
    chunks.set(m.k, cv);
  }
  const ctx = cv.getContext('2d') as unknown as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('no 2d context');
  const y0 = s.top + m.k * s.chunk;
  const a = full ? y0 : Math.max(y0, m.band![0]);
  const b = full ? y0 + s.chunk : Math.min(y0 + s.chunk, m.band![1]);
  if (b > a) {
    const pa = Math.floor((a - y0) * s.dpr), pb = Math.ceil((b - y0) * s.dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, pa, cv.width, pb - pa);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, pa, cv.width, pb - pa);
    ctx.clip();
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    paintRange(ctx, { w: { width: s.width, height: s.height }, tiles, geom: g, levels: s.levels, links: s.links, rivers: s.rivers, under: s.under, roadTerrain: s.roadTerrain, items, terrains: s.terrains }, y0 + pa / s.dpr, y0 + pb / s.dpr, y0);
    ctx.restore();
  }
  if ((queued.get(m.k) ?? 0) > 0) return;
  const blob = await cv.convertToBlob({ type: 'image/png' });
  host.postMessage({ gen: m.gen, k: m.k, seq: m.seq, blob });
}

// 届いた順に1つずつ（絵の読み込みを待つ間も、順番を守る）
let chain: Promise<void> = Promise.resolve();
host.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'paint') queued.set(m.k, (queued.get(m.k) ?? 0) + 1);
  chain = chain.then(() =>
    handle(m).catch((err: unknown) => {
      if (m.type === 'paint') host.postMessage({ gen: m.gen, k: m.k, seq: m.seq, error: String(err) });
    }),
  );
};
