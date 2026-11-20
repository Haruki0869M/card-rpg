// 異端のカードを得る（heresy: true のカードから1枚。仮面商人などのイベントでだけ手に入る）
import { CARDS } from '../../../../data/cards';
import { livingHeroes } from '../../heroes';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface OutcomeParams {
    heresyCard: {};
  }
}

export const outcome: OutcomeHandler<'heresyCard'> = {
  kind: 'heresyCard',
  apply(ctx) {
    const h = ctx.actor ?? livingHeroes(ctx.game)[0];
    if (!h) return;
    const pool = CARDS.all.filter((c) => c.heresy);
    if (!pool.length) return;
    ctx.loot.push({ kind: 'card', cardId: pool[ctx.rng.int(pool.length)].id, heroId: h.id });
  },
  describe: () => '異端のカード1枚',
};
