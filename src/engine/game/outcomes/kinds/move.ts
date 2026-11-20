// 世界マップの残りの移動力を増やす / 減らす
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    move: { amount: number };
  }
}

export const outcome: OutcomeHandler<'move'> = {
  kind: 'move',
  apply(ctx, o) {
    const w = ctx.game.world;
    if (!w || w.move === null) return;
    w.move = Math.max(0, w.move + o.amount);
  },
  describe: (o) => `残りの移動力${o.amount >= 0 ? '+' : ''}${o.amount}`,
};
