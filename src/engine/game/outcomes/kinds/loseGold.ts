// ゴールドを失う
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    loseGold: { amount: number };
  }
}

export const outcome: OutcomeHandler<'loseGold'> = {
  kind: 'loseGold',
  apply(ctx, o) {
    // 選んだキャラ（いなければ場面の先頭のキャラ）が払う
    const h = ctx.actor ?? ctx.targets(false)[0];
    if (h) h.gold = Math.max(0, h.gold - o.amount);
  },
  describe: (o) => `${o.amount}ゴールドを失う`,
};
