import { getStatus } from '../../../data/statuses';
import type { ConditionHandler } from './types';
declare module '../../../types' { interface ConditionParams { targetHasStatus: { status: string } } }
export const condition: ConditionHandler<'targetHasStatus'> = {
  kind: 'targetHasStatus',
  test: (c, e) => (c.target?.statuses[e.status] ?? 0) > 0,
  describe: e => `対象が「${getStatus(e.status).name}」の時`,
};
