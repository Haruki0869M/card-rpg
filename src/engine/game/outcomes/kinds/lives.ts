// 命の灯火を増やす（spec §11.4）
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    lives: { amount: number };
  }
}

export const outcome: OutcomeHandler<'lives'> = {
  kind: 'lives',
  apply(ctx, o) {
    ctx.game.lives += o.amount;
  },
  describe: (o) => `命の灯火+${o.amount}`,
};
