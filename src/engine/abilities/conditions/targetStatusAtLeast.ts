// 対象のその状態異常が n 以上の時
import { getStatus } from '../../../data/statuses';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    targetStatusAtLeast: { status: string; n: number };
  }
}

export const condition: ConditionHandler<'targetStatusAtLeast'> = {
  kind: 'targetStatusAtLeast',
  test: (c, e) => (c.target?.statuses[e.status] ?? 0) >= e.n,
  describe: (e) => '対象の「' + getStatus(e.status).name + '」が' + e.n + '以上の時',
};
