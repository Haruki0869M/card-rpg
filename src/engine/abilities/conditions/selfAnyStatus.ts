// 自分が、並べた状態異常のどれかにかかっている（毒か呪いの間、など）
import { getStatus } from '../../../data/statuses';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    selfAnyStatus: { statuses: string[] };
  }
}

export const condition: ConditionHandler<'selfAnyStatus'> = {
  kind: 'selfAnyStatus',
  test: (c, cond) => cond.statuses.some((s) => (c.self.statuses[s] ?? 0) > 0),
  describe: (cond) => `自分が${cond.statuses.map((s) => `「${getStatus(s).name}」`).join('か')}の間`,
};
