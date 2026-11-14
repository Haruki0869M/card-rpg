// 対象が、このターンに BREAK した敵か、「凍結」「痺れ」の敵の時（処刑人の大鎌。区切りD）
import { isEnemy } from '../../battle/units';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    targetDisabled: object;
  }
}

export const condition: ConditionHandler<'targetDisabled'> = {
  kind: 'targetDisabled',
  test: (c) => !!c.target && isEnemy(c.target) && !c.target.dead && (!!c.target.broken || (c.target.statuses.freeze ?? 0) > 0 || (c.target.statuses.paralysis ?? 0) > 0),
  describe: () => 'BREAK した敵か、「凍結」「痺れ」の敵を狙う時',
};
