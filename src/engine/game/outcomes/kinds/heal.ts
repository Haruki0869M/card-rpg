// HP回復
import { heroMaxHp } from '../../hero';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    heal: { amount: number; all?: boolean };
  }
}

export const outcome: OutcomeHandler<'heal'> = {
  kind: 'heal',
  apply(ctx, o) {
    for (const h of ctx.targets(o.all)) h.hp = Math.min(heroMaxHp(h), h.hp + o.amount);
  },
  check: (ctx, o) => (ctx.targets(o.all).every((h) => h.hp >= heroMaxHp(h)) ? 'HPは満タンです' : null),
  describe: (o) => `${o.all ? '全員の' : ''}HPを${o.amount}回復`,
};
