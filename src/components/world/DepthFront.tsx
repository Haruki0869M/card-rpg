// ===== 世界マップの奥行き（2.5D）: 駒より手前にある木・峰・岩を、駒の上にもう一度描く層 =====
// 景色（地形・木）は1枚の絵として先に描かれ、駒はその上に乗る。そのままだと、手前の木が奥の駒に踏まれて見える。
// そこで、駒がいるマスのまわりだけ、「駒の足元より手前にある物」を小さな Canvas に描き直して、駒の上に重ねる。
// 下の景色と同じ絵を同じ位置に描くので、つなぎ目は見えない。見た目だけで、ゲームの状態には関係しない。
import { memo, useEffect, useRef, useState } from 'react';
import { drawItem, itemExtent, onImagesLoaded } from './landscape/sprites';
import type { SceneItem } from './landscape/scatter';

/** 駒がいる所（地図の座標）。この四角の中だけ描き直す */
export interface FrontSpot {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 駒の足元の y。これより手前（下）に足元がある物だけを描く */
  footY: number;
  /** 重なりの順（その行の駒より上・手前の行の駒より下） */
  z: number;
  /** 透かさずに描く（施設の手前の木・山。建物は透けて見える必要が無い） */
  solid?: boolean;
}

/**
 * 手前に重ねる物の濃さ。1 にすると、大きな木や山の後ろの駒（敵の数の印も）が完全に隠れて、どこにいるか分からなくなる。
 * 少し透かして「木の後ろにいる」と分かるようにする
 */
export const FRONT_OPACITY = 0.62;

/**
 * 重ねる四角の端を、ぼかして消す。夜と夕方は、下の景色に町や野営の明かりが乗っているので、
 * 重ねた絵と明るさが少し違う。端をぼかして、四角い境目が見えないようにする
 */
const FADE = 'radial-gradient(ellipse 50% 50% at 50% 58%, #000 52%, transparent 100%)';
export const FRONT_FADE = { maskImage: FADE, WebkitMaskImage: FADE } as const;

/** 時間帯の色（朝・夕方・夜）。下の景色に掛かっている色と、ほぼ同じ色を掛ける */
export type FrontTint = { color: string; alpha: number } | undefined;

function FrontCanvas({ spot, items, tint, ver }: { spot: FrontSpot; items: SceneItem[]; tint: FrontTint; ver: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(spot.w * dpr));
    cv.height = Math.max(1, Math.round(spot.h * dpr));
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, -spot.x * dpr, -spot.y * dpr);
    let drew = false;
    for (const it of items) {
      if (it.y <= spot.footY) continue;
      const ext = itemExtent(it);
      // 上下・左右が、この四角に掛かる物だけ
      if (it.y - ext.up > spot.y + spot.h || it.y + ext.down < spot.y) continue;
      const half = it.k === 'ridge' ? Math.abs((it.x2 ?? it.x) - it.x) + it.h : it.h * 1.2;
      if (it.x + half < spot.x || it.x - half > spot.x + spot.w) continue;
      drawItem(ctx, it);
      drew = true;
    }
    if (drew && tint) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = tint.alpha;
      ctx.fillStyle = tint.color;
      ctx.fillRect(0, 0, cv.width, cv.height);
    }
    cv.style.display = drew ? 'block' : 'none';
  }, [spot.x, spot.y, spot.w, spot.h, spot.footY, items, tint, ver]);
  return <canvas ref={ref} className="pointer-events-none absolute" data-depth-front={spot.key} style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h, zIndex: spot.z, opacity: spot.solid ? 1 : FRONT_OPACITY, ...FRONT_FADE }} />;
}

/** 駒より手前の景色の物を、駒の上に重ねる */
export const DepthFront = memo(function DepthFront({ spots, items, tint }: { spots: FrontSpot[]; items: SceneItem[]; tint: FrontTint }) {
  // 絵が読み込めたら描き直す
  const [ver, setVer] = useState(0);
  useEffect(() => onImagesLoaded(() => setVer((v) => v + 1)), []);
  return (
    <>
      {spots.map((s) => (
        <FrontCanvas key={s.key} spot={s} items={items} tint={tint} ver={ver} />
      ))}
    </>
  );
});
