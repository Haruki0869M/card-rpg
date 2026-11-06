// 次の戦闘の開始時に付く状態異常
import { getStatus } from '../../../../data/statuses';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    status: { status: string; amount: number; all?: boolean };
  }
}

export const outcome: OutcomeHandler<'status'> = {
  kind: 'status',
  apply(ctx, o) {
    getStatus(o.status);
    for (const h of ctx.targets(o.all)) h.nextBattleStatuses[o.status] = (h.nextBattleStatuses[o.status] ?? 0) + o.amount;
  },
  describe: (o) => `次の戦闘で${o.all ? '全員に' : ''}「${getStatus(o.status).name}」${o.amount}`,
};
