// カードを得る（判定したキャラの職業の候補から）
import { livingHeroes } from '../../heroes';
import { heroCardPool } from '../../jobs';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface OutcomeParams {
    card: {};
  }
}

export const outcome: OutcomeHandler<'card'> = {
  kind: 'card',
  apply(ctx) {
    const h = ctx.actor ?? livingHeroes(ctx.game)[0];
    if (!h) return;
    const pool = heroCardPool(h);
    ctx.loot.push({ kind: 'card', cardId: pool[ctx.rng.int(pool.length)], heroId: h.id });
  },
  describe: () => 'カード1枚',
};
