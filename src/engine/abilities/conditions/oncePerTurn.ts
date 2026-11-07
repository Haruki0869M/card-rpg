// 1ターンに1回だけ（ここまでの条件を満たした最初の1回。key ごとに数える）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    oncePerTurn: { key: string };
  }
}

export const condition: ConditionHandler<'oncePerTurn'> = {
  kind: 'oncePerTurn',
  test: (c, cond) => {
    const counters = ((c.self as { counters?: Record<string, number> }).counters ??= {});
    const k = `once:${cond.key}`;
    const turn = c.state?.turn ?? 0;
    if (counters[k] === turn) return false;
    counters[k] = turn;
    return true;
  },
  describe: () => '1ターンに1回',
};
