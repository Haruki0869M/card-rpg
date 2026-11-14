// ダメージ（戦闘の外ではHP1より下にはならない）
import { getClass } from '../../../../data/classes';
import type { OutcomeHandler } from '../types';

const halfOf = (h: { classId: string }, n: number) => (getClass(h.classId).exploreAbility.effect.kind === 'eventDamageHalf' ? Math.ceil(n / 2) : n);


declare module '../../../../types' {
  interface OutcomeParams {
    damage: { amount: number; all?: boolean };
  }
}

export const outcome: OutcomeHandler<'damage'> = {
  kind: 'damage',
  apply(ctx, o) {
    // 区切りF: 拳聖《受け流し》は半分
    for (const h of ctx.targets(o.all)) h.hp = Math.max(1, h.hp - halfOf(h, o.amount));
  },
  describe: (o) => `${o.all ? '全員に' : ''}${o.amount}ダメージ`,
};
