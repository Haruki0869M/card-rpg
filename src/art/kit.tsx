// ===== アート共通の部品 =====
// SVG のグラデーションIDは、同じ絵を複数表示しても衝突しないよう、絵ごとに一意な接頭辞を付ける。

import { useId } from 'react';

/** 絵ごとに一意な ID を作る */
export function useArtIds() {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `${raw}-${name}`;
  const url = (name: string) => `url(#${raw}-${name})`;
  return { id, url };
}

export type Ids = ReturnType<typeof useArtIds>;

/** 3色の縦グラデーション（明るい → 中間 → 影） */
export function Grad3({ id, c, x2 = 0, y2 = 1 }: { id: string; c: readonly [string, string, string]; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0" stopColor={c[0]} />
      <stop offset=".5" stopColor={c[1]} />
      <stop offset="1" stopColor={c[2]} />
    </linearGradient>
  );
}

/** 発光（filter を使わず放射グラデーションで表現。軽い） */
export function GlowDef({ id, color, opacity = 0.85 }: { id: string; color: string; opacity?: number }) {
  return (
    <radialGradient id={id}>
      <stop offset="0" stopColor={color} stopOpacity={opacity} />
      <stop offset=".45" stopColor={color} stopOpacity={opacity * 0.35} />
      <stop offset="1" stopColor={color} stopOpacity="0" />
    </radialGradient>
  );
}

export const INK = '#1a1022';
export const STROKE = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
export const THIN = { stroke: INK, strokeWidth: 2.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** 太い線（腕など）: 輪郭の太線 → 中の色、の2本重ね */
export function Limb({ d, fill, width }: { d: string; fill: string; width: number }) {
  return (
    <>
      <path d={d} stroke={INK} strokeWidth={width + 7} strokeLinecap="round" fill="none" />
      <path d={d} stroke={fill} strokeWidth={width} strokeLinecap="round" fill="none" />
    </>
  );
}
