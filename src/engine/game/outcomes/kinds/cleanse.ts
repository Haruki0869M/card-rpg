// 次の戦闘に持ち越す悪い状態異常を治す
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    cleanse: { all?: boolean };
  }
}

export const outcome: OutcomeHandler<'cleanse'> = {
  kind: 'cleanse',
  apply(ctx, o) {
    for (const h of ctx.targets(o.all)) h.nextBattleStatuses = {};
  },
  check: (ctx, o) => (ctx.targets(o.all).some((h) => Object.values(h.nextBattleStatuses).some((v) => v)) ? null : '治す状態異常がありません'),
  describe: (o) => `${o.all ? '全員の' : ''}悪い状態異常を治す`,
};
