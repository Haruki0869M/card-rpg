// 自分が状態異常 status を min 以上持っている（例: 毒を持つ間）
import { getStatus } from '../../../data/statuses';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    selfStatus: { status: string; min?: number };
  }
}

export const condition: ConditionHandler<'selfStatus'> = {
  kind: 'selfStatus',
  test: (c, cond) => (c.self.statuses[cond.status] ?? 0) >= (cond.min ?? 1),
  describe: (cond) => `自分が「${getStatus(cond.status).name}」${cond.min && cond.min > 1 ? `${cond.min}以上` : ''}の間`,
};
