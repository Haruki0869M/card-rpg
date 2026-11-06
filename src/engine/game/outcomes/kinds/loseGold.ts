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
    ctx.game.gold = Math.max(0, ctx.game.gold - o.amount);
  },
  describe: (o) => `${o.amount}ゴールドを失う`,
};
