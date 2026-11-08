// 相手の側の生きている数が min 以上 max 以下（例: 敵が1体だけ = max 1 / 3体以上 = min 3）
import { isEnemy } from '../../battle/units';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    foeCount: { min?: number; max?: number };
  }
}

export const condition: ConditionHandler<'foeCount'> = {
  kind: 'foeCount',
  test(c, cond) {
    if (!c.state) return false;
    const n = (isEnemy(c.self) ? c.state.allies : c.state.enemies).filter((u) => !u.dead).length;
    return n >= (cond.min ?? 0) && n <= (cond.max ?? Infinity);
  },
  describe: (cond) => (cond.max === 1 && !cond.min ? '敵が1体だけの時' : cond.max !== undefined ? `敵が${cond.min ?? 0}〜${cond.max}体の時` : `敵が${cond.min}体以上の時`),
};
