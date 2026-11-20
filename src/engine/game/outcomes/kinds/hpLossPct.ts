// 最大HPの pct% 分のHPを失う（0にはならない。仮面商人の血の代償など）
import { heroMaxHp } from '../../hero';
import { getClass } from '../../../../data/classes';
import type { OutcomeHandler } from '../types';

const halfOf = (h: { classId: string }, n: number) => (getClass(h.classId).exploreAbility.effect.kind === 'eventDamageHalf' ? Math.ceil(n / 2) : n);


declare module '../../../../types' {
  interface OutcomeParams {
    hpLossPct: { pct: number };
  }
}

export const outcome: OutcomeHandler<'hpLossPct'> = {
  kind: 'hpLossPct',
  apply(ctx, o) {
    // 区切りF: 拳聖《受け流し》は半分
    for (const h of ctx.targets()) h.hp = Math.max(1, h.hp - halfOf(h, Math.ceil((heroMaxHp(h) * o.pct) / 100)));
  },
  describe: (o) => `最大HPの${o.pct}%分のHPを失う`,
};
