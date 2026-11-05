import { BALANCE } from '../../data/balance';

/** 能力値の判定の成功率（%）。カードと同じく 5〜95% に制限 */
export function finalChanceOf(value: number): number {
  return Math.max(BALANCE.chanceMin, Math.min(BALANCE.chanceMax, Math.round(value)));
}
