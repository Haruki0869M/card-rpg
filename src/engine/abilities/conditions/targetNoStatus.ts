// 対象にその状態異常がまだ付いていない時
import { getStatus } from '../../../data/statuses';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    targetNoStatus: { status: string };
  }
}

export const condition: ConditionHandler<'targetNoStatus'> = {
  kind: 'targetNoStatus',
  test: (c, e) => !!c.target && (c.target.statuses[e.status] ?? 0) <= 0,
  describe: (e) => '対象に「' + getStatus(e.status).name + '」が付いていない時',
};
