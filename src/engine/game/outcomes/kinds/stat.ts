// 能力値を永続で上げる（祠の加護など）
import { STAT_LABEL } from '../../../../data/terms';

import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    stat: { stat: StatId; amount: number; all?: boolean };
  }
}

export const outcome: OutcomeHandler<'stat'> = {
  kind: 'stat',
  apply(ctx, o) {
    for (const h of ctx.targets(o.all)) h.bonusStats[o.stat] = (h.bonusStats[o.stat] ?? 0) + o.amount;
  },
  describe: (o) => `${o.all ? '全員の' : ''}${STAT_LABEL[o.stat]}+${o.amount}（永続）`,
};
