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
    if (counters[k] === turn) {
      // 天剣: このターンだけ、もう1回（extraOnce の印を1つ使う）
      const x = `onceExtra:${cond.key}`;
      if (counters[x] !== turn) return false;
      delete counters[x];
      return true;
    }
    counters[k] = turn;
    return true;
  },
  describe: () => '1ターンに1回',
};
