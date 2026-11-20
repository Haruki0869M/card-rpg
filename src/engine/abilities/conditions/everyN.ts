// N回に1回（数えるのは、この条件まで来た時だけ。前の条件を満たした回数を数える）。幻獣ゲージなど
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    everyN: { n: number; key: string };
  }
}

export const condition: ConditionHandler<'everyN'> = {
  kind: 'everyN',
  test: (c, cond) => {
    const counters = ((c.self as { counters?: Record<string, number> }).counters ??= {});
    counters[cond.key] = (counters[cond.key] ?? 0) + 1;
    if (counters[cond.key] < cond.n) return false;
    counters[cond.key] = 0;
    return true;
  },
  describe: (cond) => `${cond.n}回ごとに`,
};
