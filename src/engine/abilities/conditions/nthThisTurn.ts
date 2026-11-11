// ここまでの条件を満たしたのが、このターンで n 回目の時だけ（key ごとに数える。試すたびに数えるので、常時型の能力には使えない。条件の最後に置く）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    nthThisTurn: { key: string; n: number };
  }
}

export const condition: ConditionHandler<'nthThisTurn'> = {
  kind: 'nthThisTurn',
  test: (c, e) => {
    const cs = ((c.self as { counters?: Record<string, number> }).counters ??= {});
    const turn = c.state?.turn ?? 0;
    if (cs['nth:' + e.key + ':turn'] !== turn) {
      cs['nth:' + e.key + ':turn'] = turn;
      cs['nth:' + e.key + ':n'] = 0;
    }
    cs['nth:' + e.key + ':n'] += 1;
    return cs['nth:' + e.key + ':n'] === e.n;
  },
  describe: (e) => 'そのターンの' + e.n + '回目',
};
