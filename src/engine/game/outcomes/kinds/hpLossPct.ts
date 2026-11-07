// 最大HPの pct% 分のHPを失う（0にはならない。仮面商人の血の代償など）
import { heroMaxHp } from '../../hero';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    hpLossPct: { pct: number };
  }
}

export const outcome: OutcomeHandler<'hpLossPct'> = {
  kind: 'hpLossPct',
  apply(ctx, o) {
    for (const h of ctx.targets()) h.hp = Math.max(1, h.hp - Math.ceil((heroMaxHp(h) * o.pct) / 100));
  },
  describe: (o) => `最大HPの${o.pct}%分のHPを失う`,
};
