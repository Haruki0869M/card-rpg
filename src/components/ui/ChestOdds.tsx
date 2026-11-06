import { CHEST_NAME } from '../../data/terms';
// ===== 宝箱の中身の格の確率（4色の帯グラフ）。spec §10.2 =====
import type { Rarity } from '../../types';
import { RARITY_STYLE } from './game';

export const GRADES: Rarity[] = ['common', 'rare', 'epic', 'legend'];
export { CHEST_NAME };

/** 確率の表示（小さい値ほど細かく: 0.2% / 6.4% / 38%） */
export function fmtPct(v: number): string {
  if (v <= 0) return '0%';
  if (v < 0.1) return '<0.1%';
  if (v < 10) return `${(Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '')}%`;
  return `${Math.round(v)}%`;
}

/**
 * 確率の帯。幅は確率に比例（小さい値も見えるよう最低幅あり）。
 * odds が変わると幅がなめらかに伸びる（CSS transition）
 */
export function OddsBar({ odds, label, height = 14, highlight, duration = 0.5 }: { odds: readonly number[]; label?: string; height?: number; highlight?: Rarity; duration?: number }) {
  return (
    <div className="w-full">
      {label && <div className="mb-0.5 text-[12px] text-zinc-300">{label}</div>}
      <div className="flex w-full overflow-hidden rounded-full border border-black/70 bg-black/60" style={{ height }}>
        {GRADES.map((g, i) => {
          const v = odds[i] ?? 0;
          const r = RARITY_STYLE[g];
          return (
            <span
              key={g}
              className="h-full"
              style={{
                flexGrow: v,
                flexBasis: v > 0 ? 4 : 0,
                minWidth: v > 0 ? 4 : 0,
                background: r.color,
                boxShadow: highlight === g ? `0 0 10px ${r.color}, inset 0 0 0 2px #fff` : undefined,
                transition: `flex-grow ${duration}s ease-out`,
              }}
            />
          );
        })}
      </div>
      <div className="mt-0.5 grid grid-cols-4 text-center text-[12px] leading-4 tabular-nums">
        {GRADES.map((g, i) => (
          <span key={g} style={{ color: RARITY_STYLE[g].color, fontWeight: highlight === g ? 800 : 600, opacity: (odds[i] ?? 0) > 0 ? 1 : 0.45 }}>
            {fmtPct(odds[i] ?? 0)}
          </span>
        ))}
      </div>
    </div>
  );
}
