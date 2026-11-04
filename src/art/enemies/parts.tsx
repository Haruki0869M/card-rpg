// 敵の絵で共通に使う部品
import { THIN } from '../kit';

/** 瘴気（filter を使わず、放射グラデーションの塊を重ねる。軽い） */
export function Aura({ url, cy = 170 }: { url: string; cy?: number }) {
  return (
    <g className="enemy-aura">
      <ellipse cx="130" cy={cy} rx="128" ry="120" fill={url} opacity=".55" />
      <ellipse cx="78" cy={cy + 40} rx="70" ry="60" fill={url} opacity=".5" />
      <ellipse cx="186" cy={cy + 20} rx="66" ry="70" fill={url} opacity=".45" />
      <ellipse cx="130" cy={cy - 50} rx="80" ry="56" fill={url} opacity=".4" />
    </g>
  );
}

/** 発光する目（光の輪 + 目の形） */
export function EnemyEye({ cx, cy, glow, d, color }: { cx: number; cy: number; glow: string; d: string; color: string }) {
  return (
    <g className="enemy-eye">
      <circle cx={cx} cy={cy} r="16" fill={glow} />
      <path d={d} fill={color} {...THIN} />
    </g>
  );
}
