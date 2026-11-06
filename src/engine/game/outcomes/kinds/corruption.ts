// 侵食度を増やす・減らす（世界マップがある時だけ）
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    corruption: { amount: number };
  }
}

export const outcome: OutcomeHandler<'corruption'> = {
  kind: 'corruption',
  apply(ctx, o) {
    const w = ctx.game.world;
    if (w) w.corruption = Math.max(0, w.corruption + o.amount);
  },
  describe: (o) => `侵食度${o.amount >= 0 ? '+' : ''}${o.amount}%`,
};
