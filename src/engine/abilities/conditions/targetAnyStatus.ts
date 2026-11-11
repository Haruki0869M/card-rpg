// 対象が、並べた状態異常のどれかにかかっている（凍結か弱体の敵、など）
import { getStatus } from '../../../data/statuses';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    targetAnyStatus: { statuses: string[] };
  }
}

export const condition: ConditionHandler<'targetAnyStatus'> = {
  kind: 'targetAnyStatus',
  test: (c, cond) => cond.statuses.some((s) => (c.target?.statuses[s] ?? 0) > 0),
  describe: (cond) => `対象が${cond.statuses.map((s) => `「${getStatus(s).name}」`).join('か')}の時`,
};
