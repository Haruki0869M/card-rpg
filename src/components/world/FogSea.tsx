// ===== 世界マップの雲の海（まだ見ていないマスと、地図の外） =====
// - 雲の絵は、最初に1回だけ作る（つなぎ目の出ない雲の模様。乱数は使わず、決まった計算で作る）
// - 雲の層は2枚（遠い層はゆっくり大きく、近い層は少し速く薄く）。動かすのは transform だけ（地図の描き直しは起きない）
// - 見えているマスの所は、ぼかした「穴」で雲を抜く（マスの形が出ないように、境目はふんわり）
// - 霧が晴れたマスは、雲が薄く千切れて外へ流れながら消える
// 「動きを減らす」の時は、雲は止まり、晴れる時もすぐ消える（index.css）
import { memo, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { TimeOfDay, WorldState } from '../../types';
import { BASE_DEPTH, GROUND_K, hash01, hexVerts, LEVEL_STEP, pts } from './diorama';

/** 地図の座標（WorldMap の MapGeom の一部） */
interface Geom {
  R: number;
  W: number;
  H: number;
  center: (i: number) => { x: number; y: number };
}

/**
 * 画像の長い文字列（data URL）を、短い blob の URL にする。
 * 長い文字列をそのまま style に入れると、描き直しのたびに読み込み直しになり、スマホで数百ms止まるため
 */
function dataToBlobUrl(data: string): string {
  const [head, b64] = data.split(',');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([buf], { type: head.slice(5, head.indexOf(';')) }));
}
const svgBlobUrl = (svg: string) => URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

// ---- 雲の模様（つなぎ目の出ない雲。周期のある値のノイズを重ねる） ----
const texCache = new Map<string, string | undefined>();
function cloudTexture(kind: 'sea' | 'miasma', layer: 0 | 1): string | undefined {
  const key = `${kind}:${layer}`;
  if (texCache.has(key)) return texCache.get(key);
  let url: string | undefined;
  try {
    const N = 256;
    const cv = document.createElement('canvas');
    cv.width = N;
    cv.height = N;
    const ctx = cv.getContext('2d');
    if (ctx) {
      const img = ctx.createImageData(N, N);
      const seed = layer * 97 + 13;
      // 周期 P の格子の値（端と端がつながる）
      const lat = (x: number, y: number, P: number, o: number) => hash01(((x % P) + P) % P * 977 + (((y % P) + P) % P) * 131 + o * 7919, seed);
      const smooth = (t: number) => t * t * (3 - 2 * t);
      const noise = (u: number, v: number, P: number, o: number) => {
        const x = u * P, y = v * P;
        const x0 = Math.floor(x), y0 = Math.floor(y);
        const fx = smooth(x - x0), fy = smooth(y - y0);
        const a = lat(x0, y0, P, o), b = lat(x0 + 1, y0, P, o), c = lat(x0, y0 + 1, P, o), d = lat(x0 + 1, y0 + 1, P, o);
        return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
      };
      const base = layer ? 3 : 2;
      const [cr, cg, cb] = kind === 'sea' ? [232, 234, 246] : [196, 160, 226];
      const [sr, sg, sb] = kind === 'sea' ? [150, 156, 190] : [96, 56, 130];
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const u = x / N, v = y / N;
          let f = 0, amp = 0.55, tot = 0;
          for (let o = 0; o < 5; o++) {
            f += noise(u, v, base << o, o) * amp;
            tot += amp;
            amp *= 0.5;
          }
          f /= tot;
          // かたまりにする（薄い所は透明、濃い所は白く、ふちは影の色）
          const dens = Math.min(1, Math.max(0, (f - 0.42) / 0.3));
          // 上の方を明るく（光が上から当たる）: 少し上のノイズとの差で陰影をつける
          const k = (y * N + x) * 4;
          const lit = Math.min(1, Math.max(0, 0.55 + (f - noise(u, (v + 0.012) % 1, base, 0) * 0.5 - 0.25) * 2));
          img.data[k] = sr + (cr - sr) * lit;
          img.data[k + 1] = sg + (cg - sg) * lit;
          img.data[k + 2] = sb + (cb - sb) * lit;
          img.data[k + 3] = Math.round(255 * dens * dens * (3 - 2 * dens));
        }
      }
      ctx.putImageData(img, 0, 0);
      url = dataToBlobUrl(cv.toDataURL('image/png'));
    }
  } catch {
    url = undefined; // 画面のない所（テスト）では作らない
  }
  texCache.set(key, url);
  return url;
}

/** 図形の一覧（y = 中心の高さ。区切りごとに、近い物だけを使う） */
type Shape = { y: number; s: string };

/** 見えているマスの「穴」（上の面と、手前の側面まで）。隣どうしは重なってよい */
function holeShapes(g: Geom, tiles: WorldState['tiles'], levels: readonly number[], offY: number): Shape[] {
  const { R, center } = g;
  const out: Shape[] = [];
  tiles.forEach((t, i) => {
    if (!t.seen) return;
    const { x, y } = center(i);
    const v = hexVerts(x, y + offY, R * 0.96);
    const dep = (BASE_DEPTH + levels[i] * LEVEL_STEP) * R;
    const sh: [number, number][] = [v[0], v[1], [v[2][0], v[2][1] + dep], [v[3][0], v[3][1] + dep], [v[4][0], v[4][1] + dep], v[5]];
    out.push({ y: y + offY, s: `<polygon points="${pts(sh)}"/>` });
  });
  return out;
}

/**
 * 雲を出す所の形（マスク）。白い所に雲が出る。
 * 境目は SVG のぼかし（filter）を使わず、太さと濃さを変えた線を重ねてやわらかくする
 * （拡大した時の縦に長い画像では、ブラウザがぼかしを途中で打ち切り、下の方に雲の線が出たため）
 */
function maskSvg(w: number, top: number, h: number, soft: number, shapes0: Shape[], invert: boolean, reach: number) {
  // この区切り（top〜top+h）に近い図形だけ。座標は区切りの上の端を0にする
  const body = `<g transform="translate(0,${(-top).toFixed(1)})">${shapes0.filter((x) => x.y > top - reach && x.y < top + h + reach).map((x) => x.s).join('')}</g>`;
  const c = invert ? 'black' : 'white';
  const feather = [
    [2.4, 0.22],
    [1.6, 0.4],
    [0.9, 0.65],
  ]
    .map(([k, o]) => `<g fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="${(soft * k).toFixed(1)}" stroke-linejoin="round">${body}</g>`)
    .join('');
  const shapes = `${feather}<g fill="${c}">${body}</g>`;
  const svg = invert
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="white"/>${shapes}</mask></defs><rect width="${w}" height="${h}" fill="white" mask="url(#m)"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${shapes}</svg>`;
  return svg;
}

/** SVG の文字列の並びを blob の URL にする（前の URL は捨てる）。画面のない所（テスト）では空 */
function useBlobUrls(make: () => (string | undefined)[], deps: unknown[]): (string | undefined)[] {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const urls = useMemo(() => {
    if (typeof URL === 'undefined' || !URL.createObjectURL) return [];
    try {
      return make().map((svg) => (svg ? svgBlobUrl(svg) : undefined));
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  // 古い URL は、新しい雲が出てから捨てる。地図を閉じた時も捨てる（開発中の二重の呼び出しで、使っている物を捨てないよう少し待つ）
  const prev = useRef<(string | undefined)[]>([]);
  const live = useRef(true);
  useEffect(() => {
    const old = prev.current;
    prev.current = urls;
    if (old !== urls) setTimeout(() => old.forEach((u) => u && URL.revokeObjectURL(u)), 1000);
  }, [urls]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      setTimeout(() => {
        if (!live.current) prev.current.forEach((u) => u && URL.revokeObjectURL(u));
      }, 1000);
    };
  }, []);
  return urls;
}

interface Props {
  tiles: WorldState['tiles'];
  geom: Geom;
  levels: readonly number[];
  /** 地図の上・下の余白（雲の海は余白まで広げる。地図の外が黒く見えないように） */
  padTop: number;
  padBottom: number;
  /** 瘴気の色にする、まだ見ていないマス */
  miasma: (i: number) => boolean;
  /** 今、霧が晴れたばかりのマス */
  fresh: ReadonlySet<number>;
  time: TimeOfDay;
}

/** 雲の海の層。WorldMap の地図の箱（上の余白の分だけ上へずらす）の中に置く */
export const FogSea = memo(function FogSea({ tiles, geom, levels, padTop, padBottom, miasma, fresh, time }: Props) {
  const { R, W, H } = geom;
  const totalH = Math.round(padTop + H + padBottom);
  const soft = R * 0.5;
  // 雲の海は、縦に CHUNK ずつの区切りに分けて描く（1枚の大きな画像だと、拡大した時にスマホの描画の上限を超えるため）
  const CHUNK = 720;
  const chunks = Array.from({ length: Math.max(1, Math.ceil(totalH / CHUNK)) }, (_, k) => ({ top: k * CHUNK, h: Math.min(CHUNK, totalH - k * CHUNK) }));
  const holes = useMemo(() => holeShapes(geom, tiles, levels, padTop), [geom, tiles, levels, padTop]);
  const miasmaShapes = useMemo(() => {
    const out: Shape[] = [];
    tiles.forEach((t, i) => {
      if (t.seen || !miasma(i)) return;
      const { x, y } = geom.center(i);
      // 丸い形を重ねて、マスの形（六角形のキルト模様）を出さない
      out.push({ y: y + padTop, s: `<ellipse cx="${x.toFixed(1)}" cy="${(y + padTop).toFixed(1)}" rx="${(R * 1.2).toFixed(1)}" ry="${(R * 1.1 * GROUND_K).toFixed(1)}"/>` });
    });
    return out;
  }, [tiles, miasma, geom, padTop, R]);
  const Wc = Math.ceil(W);
  const reach = R * 3;
  const seaMasks = useBlobUrls(() => chunks.map((c) => maskSvg(Wc, c.top, c.h, soft, holes, true, reach)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [holes, Wc, totalH, soft]);
  const miasmaMasks = useBlobUrls(() => chunks.map((c) => (miasmaShapes.some((x) => x.y > c.top - reach && x.y < c.top + c.h + reach) ? maskSvg(Wc, c.top, c.h, soft, miasmaShapes, false, reach) : undefined)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [miasmaShapes, Wc, totalH, soft]);
  const sea = [cloudTexture('sea', 0), cloudTexture('sea', 1)];
  const mia = miasmaMasks.some(Boolean) ? [cloudTexture('miasma', 0), cloudTexture('miasma', 1)] : [];
  const night = time === 'night';
  // 雲の模様の大きさ（遠い層は大きく、近い層は少し小さく）
  const far = Math.round(R * 11);
  const near = Math.round(R * 7);
  const masked = (c: { top: number; h: number }, url: string): CSSProperties => ({ left: 0, top: c.top - padTop, width: W, height: c.h, WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' });
  // 模様の位置は、雲の海全体の左上を基準にそろえる（区切りの境目で模様がずれないように）
  const posY = (layerTop: number, tile: number) => `${(((-layerTop % tile) + tile) % tile).toFixed(1)}px`;
  const layers = (c: { top: number }, tex: (string | undefined)[], dim: number) => (
    <>
      {tex[0] && <div className="fog-far absolute" style={{ left: -far, top: -far * 0.5, right: -far, bottom: -far * 0.5, backgroundImage: `url(${tex[0]})`, backgroundSize: `${far}px ${far}px`, backgroundPosition: `0px ${posY(c.top - far * 0.5, far)}`, opacity: 0.9 * dim, '--tile': `${far}px` } as CSSProperties} />}
      {tex[1] && <div className="fog-near absolute" style={{ left: -near, top: -near * 0.5, right: -near, bottom: -near * 0.5, backgroundImage: `url(${tex[1]})`, backgroundSize: `${near}px ${near}px`, backgroundPosition: `0px ${posY(c.top - near * 0.5, near)}`, opacity: 0.55 * dim, '--tile': `${near}px` } as CSSProperties} />}
    </>
  );
  return (
    <>
      {chunks.map((c, k) =>
        seaMasks[k] ? (
          <div key={`s${k}`} className="pointer-events-none absolute overflow-hidden" style={{ ...masked(c, seaMasks[k]!), background: night ? '#20233c' : '#53587a' }} data-fog-sea={k}>
            {layers(c, sea, night ? 0.45 : 1)}
          </div>
        ) : null,
      )}
      {chunks.map((c, k) =>
        miasmaMasks[k] ? (
          <div key={`m${k}`} className="pointer-events-none absolute overflow-hidden" style={{ ...masked(c, miasmaMasks[k]!), background: night ? 'rgba(40,14,60,.75)' : 'rgba(66,26,96,.72)' }} data-fog-miasma={k}>
            {layers(c, mia, night ? 0.5 : 0.9)}
          </div>
        ) : null,
      )}
      {/* 霧が晴れたマス: 雲が千切れて外へ流れながら消える */}
      {[...fresh].map((i) => {
        const { x, y } = geom.center(i);
        return [0, 1, 2].map((k) => {
          const a = hash01(i, 70 + k) * Math.PI * 2;
          const s = R * (1.3 + hash01(i, 80 + k) * 0.6);
          const ox = Math.cos(a) * R * 0.35, oy = Math.sin(a) * R * 0.25;
          return (
            <div
              key={`${i}-${k}`}
              className="cloud-tear pointer-events-none absolute rounded-full"
              style={{
                left: x + ox - s / 2,
                top: y + oy - s / 2,
                width: s,
                height: s,
                backgroundImage: sea[k & 1] ? `url(${sea[k & 1]})` : undefined,
                backgroundColor: sea[k & 1] ? undefined : 'rgba(200,204,224,.6)',
                backgroundSize: `${near}px ${near}px`,
                backgroundPosition: `${Math.round(hash01(i, 90 + k) * near)}px 0`,
                WebkitMaskImage: 'radial-gradient(circle, #000 25%, transparent 68%)',
                maskImage: 'radial-gradient(circle, #000 25%, transparent 68%)',
                '--tx': `${(Math.cos(a) * R * 0.9).toFixed(1)}px`,
                '--ty': `${(Math.sin(a) * R * 0.6 - R * 0.3).toFixed(1)}px`,
                animationDelay: `${k * 40}ms`,
              } as CSSProperties}
            />
          );
        });
      })}
    </>
  );
});
