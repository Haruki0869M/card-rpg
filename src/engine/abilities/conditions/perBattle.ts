// 1回の戦闘で max 回まで（ここまでの条件を満たした回数を数える）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    perBattle: { key: string; max: number };
  }
}

export const condition: ConditionHandler<'perBattle'> = {
  kind: 'perBattle',
  test: (c, cond) => {
    const counters = ((c.self as { counters?: Record<string, number> }).counters ??= {});
    const k = `battle:${cond.key}`;
    if ((counters[k] ?? 0) >= cond.max) return false;
    counters[k] = (counters[k] ?? 0) + 1;
    return true;
  },
  describe: (cond) => `1回の戦闘で${cond.max}回まで`,
};
