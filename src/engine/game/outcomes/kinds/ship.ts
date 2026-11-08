// 船を手に入れる（世界マップがある時だけ。K4 段3）。パーティ全員で共有する
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface OutcomeParams {
    ship: {};
  }
}

export const outcome: OutcomeHandler<'ship'> = {
  kind: 'ship',
  apply(ctx) {
    const w = ctx.game.world;
    if (w) w.ship = true;
  },
  describe: () => '船を手に入れる',
};
