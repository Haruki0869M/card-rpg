// フォーカス回復
import { heroFocusMax } from '../../hero';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    gainFocus: { amount: number; all?: boolean };
  }
}

export const outcome: OutcomeHandler<'gainFocus'> = {
  kind: 'gainFocus',
  apply(ctx, o) {
    for (const h of ctx.targets(o.all)) h.focus = Math.min(heroFocusMax(h), h.focus + o.amount);
  },
  check: (ctx, o) => (ctx.targets(o.all).every((h) => h.focus >= heroFocusMax(h)) ? 'フォーカスは最大です' : null),
  describe: (o) => `${o.all ? '全員の' : ''}フォーカス+${o.amount}`,
};
