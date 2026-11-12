// 区切りF: 竜脈術師《竜脈》(1)。今付けた状態異常が、その敵にまだ付いていなかった種類の時（付けた量 ＝ 今の量）
import { isEnemy } from '../../battle/units';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    statusFresh: object;
  }
}

export const condition: ConditionHandler<'statusFresh'> = {
  kind: 'statusFresh',
  test: (c) => !!c.target && isEnemy(c.target) && !!c.statusId && (c.target.statuses[c.statusId as keyof typeof c.target.statuses] ?? 0) <= (c.dealt ?? 0),
  describe: () => 'その敵にまだ付いていなかった種類の状態異常を付けた時',
};
