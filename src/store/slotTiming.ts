// ===== スロットの止まり方の時間（段階C）。見た目だけの純粋な関数（状態・乱数に触れない） =====
import { TIMING } from '../data/balance';
import type { SlotResult } from '../types';

export interface SlotTiming {
  /** 各枠が止まる時刻（秒・回り始めから）。フォーカスの枠は 0（最初から確定） */
  stops: number[];
  /** 全部止まって結果が出る時刻（秒） */
  total: number;
  /** 最後に止まる枠（リーチの光を強める枠）。回る枠が無ければ -1 */
  last: number;
}

/** 左の枠から1つずつ止める。高速モードの短縮は呼ぶ側で（store の speedFactor で割る） */
export function slotTiming(results: readonly SlotResult[]): SlotTiming {
  const spin = results.filter((r) => r !== 'focus').length;
  if (!spin) return { stops: results.map(() => 0), total: TIMING.slotFocusOnly, last: -1 };
  let step: number = TIMING.slotStep;
  // 枠が多い時は、全体が上限に収まるように1枠を短く（最短 slotStepMin）
  if (TIMING.slotLeadMin + step * spin > TIMING.slotTotalMax) step = Math.max(TIMING.slotStepMin, (TIMING.slotTotalMax - TIMING.slotLeadMin) / spin);
  // 枠が少ない時は、最初の溜めを長くして全体を下限に合わせる
  const lead = Math.max(TIMING.slotLeadMin, TIMING.slotTotalMin - step * spin);
  let k = 0, last = -1;
  const stops = results.map((r, i) => {
    if (r === 'focus') return 0;
    k++; last = i;
    return lead + step * k;
  });
  return { stops, total: lead + step * spin, last };
}

/** 最後の1枠の前まで全部成功している（完全成功のリーチ）。枠が2つ以上で、最後の枠が回る時だけ */
export function isReach(results: readonly SlotResult[], last: number): boolean {
  return results.length >= 2 && last >= 0 && results.slice(0, last).every((r) => r !== 'miss') && results.slice(last + 1).every((r) => r !== 'miss');
}
