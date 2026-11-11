// 対象が、大技を予告している敵（まだ体勢を崩されていない）の時
import { getEnemyAction } from '../../../data/enemies';
import { isEnemy } from '../../battle/units';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    targetBigIntent: object;
  }
}

export const condition: ConditionHandler<'targetBigIntent'> = {
  kind: 'targetBigIntent',
  test: (c) => {
    const t = c.target;
    if (!t || !isEnemy(t) || t.dead || t.broken || !t.intent) return false;
    return !!getEnemyAction(t.defId, t.intent.actionId).big;
  },
  describe: () => '大技を予告している敵を狙う時',
};
