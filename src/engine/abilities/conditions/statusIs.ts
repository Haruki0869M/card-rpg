// きっかけになった状態異常が、この種類の時（「火傷」を与えた時・敵が「毒」でダメージを受けた時、など）
import { getStatus } from '../../../data/statuses';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    statusIs: { status: string };
  }
}

export const condition: ConditionHandler<'statusIs'> = {
  kind: 'statusIs',
  test: (c, cond) => c.statusId === cond.status,
  describe: (cond) => `「${getStatus(cond.status).name}」の時`,
};
