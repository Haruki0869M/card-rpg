// ダメージ（戦闘の外ではHP1より下にはならない）
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    damage: { amount: number; all?: boolean };
  }
}

export const outcome: OutcomeHandler<'damage'> = {
  kind: 'damage',
  apply(ctx, o) {
    for (const h of ctx.targets(o.all)) h.hp = Math.max(1, h.hp - o.amount);
  },
  describe: (o) => `${o.all ? '全員に' : ''}${o.amount}ダメージ`,
};
