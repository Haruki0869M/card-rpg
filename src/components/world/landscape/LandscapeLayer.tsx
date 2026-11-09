// ===== 景色の層（Canvas）と、霧の向こうのシルエット =====
// 動かない景色（地面・崖・岸辺・川・道・木・峰・岩）は、縦に区切った Canvas に前もって描いた絵にする。
// スクロールは絵を動かすだけ。描き直すのは「霧が晴れた区切り」と「拡大を変えた時（指を離してから）」だけ。
// ピンチの最中は、前の絵を CSS で拡大して見せる（docs/tasks/diorama-design.md ④）。
// 確認スクリプトのために、マスの形（data-hex・data-fog-tile）は透明な SVG に残す。
import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { WorldState } from '../../../types';
import { GROUND_K, hexVerts, LEVEL_STEP, neighborAt, pts, TOP_SCALE } from '../diorama';
import { paintRange, type PaintGeom } from './paint';
import { scatter } from './scatter';
import { itemExtent, onImagesLoaded, silhouettePath } from './sprites';

/**
 * 区切り1枚の高さ（CSS の px）。
 * 描いた Canvas は、そのまま画面に置かず、画像（img）にして見せる。Canvas は1枚ずつが別の重ね合わせの層になり、
 * 雲が動くたび・スクロールのたびの重ね合わせが重くなった（拡大2倍で歩く時 47→30fps。world-perf.mjs）。
 * 画像にするまで（最初の一瞬）は Canvas を見せる
 */
const CHUNK = 512;
/**
 * Canvas の画素の合計の上限（約 14MB）。画素が多いと、スクロールや雲の動きのたびの重ね合わせが重くなる
 * （拡大2倍・画素2倍で、止まっている時でも 60→43fps に落ちた。world-perf.mjs）。
 * 1倍の拡大では画素2倍のまま、拡大するほど少しずつ粗くする（水彩ふうの絵なので目立ちにくい）
 */
const MAX_PIXELS = 3_500_000;

interface Props {
  w: Pick<WorldState, 'width' | 'height'>;
  tiles: WorldState['tiles'];
  geom: PaintGeom;
  levels: readonly number[];
  links: Map<number, number[]>;
  rivers: Map<number, number[]>;
  under: readonly string[];
  roadTerrain: string;
  /** 立つ物を置かないマス（最後の城） */
  noProp: ReadonlySet<number>;
  /** 侵食度の段階（0〜3） */
  stage: number;
  /** ピンチの最中（描き直さず、前の絵を拡大して見せる） */
  frozen: boolean;
}

export const LandscapeLayer = memo(function LandscapeLayer({ w, tiles, geom, levels, links, rivers, under, roadTerrain, noProp, stage, frozen }: Props) {
  // 描く時の地図の大きさ（ピンチの最中は、前の大きさのまま）
  const [drawGeom, setDrawGeom] = useState(geom);
  if (!frozen && drawGeom !== geom) setDrawGeom(geom);
  const g = frozen ? drawGeom : geom;
  const { R, W, H } = g;
  const items = useMemo(
    () => scatter({ w: { ...w, tiles }, geom: g, levels, links, rivers, stage, blocked: (i) => !!tiles[i].f || noProp.has(i) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w.width, w.height, tiles, g, levels, links, rivers, stage, noProp],
  );
  // 上は一番上の行の峰・木がはみ出す分、下は崖と影の分
  const top = -R * 2.8;
  const bottom = H + R * 0.6;
  const n = Math.max(1, Math.ceil((bottom - top) / CHUNK));
  const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, Math.sqrt(MAX_PIXELS / Math.max(1, W * (bottom - top))));
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const [imgVer, setImgVer] = useState(0);
  useEffect(() => onImagesLoaded(() => setImgVer((v) => v + 1)), []);

  // 前に描いた時の状態（何が変わったかで、描き直す区切りを決める）
  const last = useRef<{ g: PaintGeom; tiles: WorldState['tiles']; stage: number; ver: number; dpr: number } | null>(null);
  /** 描き直しを待つ区切り → その中の描き直す帯（地図の y） */
  const pending = useRef<Map<number, [number, number]>>(new Map());
  const raf = useRef(0);
  const input = { w, tiles, geom: g, levels, links, rivers, under, roadTerrain, items };
  const inputRef = useRef(input);
  inputRef.current = input;

  /** 区切り k を描く。band = その中の帯だけ（霧が晴れた時。描く量を減らして、歩いている間の引っかかりを抑える） */
  const paint = (k: number, band?: [number, number]) => {
    const cv = canvases.current[k];
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const y0 = top + k * CHUNK;
    const a = Math.max(y0, band?.[0] ?? y0);
    const b = Math.min(y0 + CHUNK, band?.[1] ?? y0 + CHUNK);
    if (b <= a) return;
    // 帯の上下を画素の境目にそろえる（帯の端に細い線が出ないように）
    const pa = Math.floor((a - y0) * dpr), pb = Math.ceil((b - y0) * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, pa, cv.width, pb - pa);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, pa, cv.width, pb - pa);
    ctx.clip();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintRange(ctx, inputRef.current, y0 + pa / dpr, y0 + pb / dpr, y0);
    ctx.restore();
    toImage(k, cv);
  };
  /** Canvas の絵を画像にして、区切りの img に入れる（できたら Canvas を隠す。前の画像の URL は捨てる） */
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const toImage = (k: number, cv: HTMLCanvasElement) => {
    if (!cv.toBlob || typeof URL === 'undefined' || !URL.createObjectURL) return;
    const seq = (cv.dataset.seq = String(Number(cv.dataset.seq ?? 0) + 1));
    cv.toBlob((blob) => {
      const img = imgs.current[k];
      if (!blob || !img || cv.dataset.seq !== seq) return;
      const url = URL.createObjectURL(blob);
      const old = img.dataset.url;
      img.onload = () => {
        img.style.visibility = 'visible';
        cv.style.display = 'none';
        if (old) URL.revokeObjectURL(old);
      };
      img.dataset.url = url;
      img.src = url;
    });
  };

  const runPending = () => {
    cancelAnimationFrame(raf.current);
    const step = () => {
      const next = pending.current.entries().next().value;
      if (!next) return;
      pending.current.delete(next[0]);
      paint(next[0], next[1]);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  useLayoutEffect(() => {
    if (frozen) return;
    const prev = last.current;
    last.current = { g, tiles, stage, ver: imgVer, dpr };
    const all = !prev || prev.g !== g || prev.stage !== stage || prev.ver !== imgVer || prev.dpr !== dpr || prev.tiles.length !== tiles.length;
    if (all) {
      // 最初・拡大を変えた時・絵が読み込めた時: 全部をすぐ描く（白い絵が一瞬出ないように）
      cancelAnimationFrame(raf.current);
      pending.current.clear();
      for (let k = 0; k < n; k++) paint(k);
      return;
    }
    if (prev.tiles === tiles) return;
    // 霧が晴れた時: 晴れたマス（と、その周りの木・峰）の帯
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].seen === prev.tiles[i].seen) continue;
      const ys = [i, ...[0, 1, 2, 3, 4, 5].map((k) => neighborAt(w, i, k) ?? i)].map((j) => g.center(j).y);
      lo = Math.min(lo, Math.min(...ys) - R * 2.6);
      hi = Math.max(hi, Math.max(...ys) + R * 1.2);
    }
    if (!(hi > lo)) return;
    for (let k = Math.max(0, Math.floor((lo - top) / CHUNK)); k <= Math.min(n - 1, Math.floor((hi - top) / CHUNK)); k++) {
      const was = pending.current.get(k);
      pending.current.set(k, was ? [Math.min(was[0], lo), Math.max(was[1], hi)] : [lo, hi]);
    }
    runPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, tiles, stage, imgVer, frozen, dpr, n]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  void itemExtent;

  const scale = geom.R / g.R;
  return (
    <>
      <div className="pointer-events-none absolute left-0" style={{ top: 0, width: W, height: H, transform: scale !== 1 ? `scale(${scale})` : undefined, transformOrigin: '0 0' }} data-landscape-layer>
        {Array.from({ length: n }, (_, k) => (
          <Fragment key={`${k}:${Math.round(W)}:${dpr}`}>
            <canvas
              ref={(el) => {
                canvases.current[k] = el;
              }}
              width={Math.ceil(W * dpr)}
              height={Math.ceil(CHUNK * dpr)}
              className="absolute left-0 block"
              style={{ top: top + k * CHUNK, width: W, height: CHUNK }}
              data-landscape-chunk={k}
            />
            <img
              ref={(el) => {
                const was = imgs.current[k];
                if (!el && was?.dataset.url) URL.revokeObjectURL(was.dataset.url);
                imgs.current[k] = el;
              }}
              alt=""
              draggable={false}
              className="absolute left-0 block max-w-none select-none"
              style={{ top: top + k * CHUNK, width: W, height: CHUNK, visibility: 'hidden' }}
              data-landscape-image={k}
            />
          </Fragment>
        ))}
      </div>
      <HexShapes tiles={tiles} geom={geom} levels={levels} />
    </>
  );
});

/** マスの形（透明）。確認スクリプトが、マスの位置と大きさ・霧のマスの数を数える */
const HexShapes = memo(function HexShapes({ tiles, geom, levels }: { tiles: WorldState['tiles']; geom: PaintGeom; levels: readonly number[] }) {
  const { R } = geom;
  return (
    <svg width={geom.W} height={geom.H} className="pointer-events-none absolute inset-0 block" data-terrain-layer>
      {tiles.map((t, i) => {
        if (!t.seen) return null;
        const { x, y } = geom.center(i);
        return (
          <g key={i} data-hex={i} data-level={levels[i]}>
            <polygon points={pts(hexVerts(x, y, R * TOP_SCALE))} fill="transparent" />
          </g>
        );
      })}
      <g data-fog>
        {tiles.map((t, i) => {
          if (t.seen) return null;
          const gr = geom.ground(i);
          return <polygon key={i} data-fog-tile={i} points={pts(hexVerts(gr.x, gr.y - LEVEL_STEP * R, R))} fill="none" />;
        })}
      </g>
    </svg>
  );
});

/**
 * 霧の向こうのシルエット（オーナーの決定で入れる）。見えている所から4マス以内の、まだ見ていない山・火山を、
 * 霧の色で淡く（遠いほど薄く）。最後の城は、まだ見ていない間、地図の上の余白（地平線）に大きく淡く立てる
 */
export const FogSilhouettes = memo(function FogSilhouettes({
  w,
  tiles,
  geom,
  levels,
  finale,
  padTop,
  night,
}: {
  w: Pick<WorldState, 'width' | 'height'>;
  tiles: WorldState['tiles'];
  geom: PaintGeom;
  levels: readonly number[];
  finale?: number;
  padTop: number;
  night: boolean;
}) {
  const { R } = geom;
  const shapes = useMemo(() => {
    // 見えているマスからの距離（幅優先・4マスまで）
    const dist = new Map<number, number>();
    const q: number[] = [];
    tiles.forEach((t, i) => {
      if (t.seen) {
        dist.set(i, 0);
        q.push(i);
      }
    });
    while (q.length) {
      const i = q.shift()!;
      const d = dist.get(i)!;
      if (d >= 4) continue;
      for (let k = 0; k < 6; k++) {
        const j = neighborAt(w, i, k);
        if (j === undefined || dist.has(j)) continue;
        dist.set(j, d + 1);
        q.push(j);
      }
    }
    const out: { d: string; a: number }[] = [];
    tiles.forEach((t, i) => {
      const d = dist.get(i);
      if (t.seen || d === undefined || d === 0 || (t.t !== 'mountain' && t.t !== 'lava')) return;
      const gr = geom.ground(i);
      const y = gr.y - levels[i] * LEVEL_STEP * R + R * 0.42 * GROUND_K;
      out.push({ d: silhouettePath('peak', gr.x, y, R * (1.5 + (i % 3) * 0.12), (i * 0.37) % 1), a: [0, 0.55, 0.42, 0.3, 0.18][d] });
    });
    // 地平線の城（まだ見ていない時だけ）
    if (finale !== undefined && !tiles[finale]?.seen) out.push({ d: silhouettePath('castle', geom.center(finale).x, -padTop * 0.18, R * 3.4, 0), a: 0.4 });
    return out;
  }, [w, tiles, geom, levels, finale, padTop, R]);
  if (!shapes.length) return null;
  const color = night ? '#161a36' : '#5a5e84';
  return (
    <svg width={geom.W} height={geom.H + padTop} className="pointer-events-none absolute left-0 block" style={{ top: -padTop, overflow: 'visible' }} data-fog-silhouettes>
      <defs>
        <linearGradient id="sil-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="1" />
          <stop offset="0.7" stopColor={color} stopOpacity="0.8" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(0 ${padTop})`}>
        {shapes.map((s, k) => (
          <path key={k} d={s.d} fill="url(#sil-fade)" opacity={s.a} data-silhouette />
        ))}
      </g>
    </svg>
  );
});
