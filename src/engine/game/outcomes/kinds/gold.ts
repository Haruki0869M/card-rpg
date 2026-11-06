// ゴールドを得る
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    gold: { amount: number };
  }
}

export const outcome: OutcomeHandler<'gold'> = {
  kind: 'gold',
  apply(ctx, o) {
    ctx.loot.push({ kind: 'gold', amount: o.amount });
  },
  describe: (o) => `${o.amount}ゴールド`,
};
