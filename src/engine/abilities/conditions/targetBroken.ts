// 対象が、このターンに体勢を崩された（BREAK）敵の時
import { isEnemy } from '../../battle/units';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    targetBroken: object;
  }
}

export const condition: ConditionHandler<'targetBroken'> = {
  kind: 'targetBroken',
  test: (c) => !!c.target && isEnemy(c.target) && !c.target.dead && !!c.target.broken,
  describe: () => 'このターンに BREAK した敵を狙う時',
};
