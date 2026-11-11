// 1ターンに max 回まで（ここまでの条件を満たした回数を、key ごと・ターンごとに数える）
// 数えは持ち主の counters に入るので、保存して再開しても・オンラインでも同じ結果になる
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    perTurn: { key: string; max: number };
  }
}

export const condition: ConditionHandler<'perTurn'> = {
  kind: 'perTurn',
  test: (c, cond) => {
    const counters = ((c.self as { counters?: Record<string, number> }).counters ??= {});
    const kt = `perTurn:${cond.key}:turn`, kn = `perTurn:${cond.key}:n`;
    const turn = c.state?.turn ?? 0;
    if (counters[kt] !== turn) {
      counters[kt] = turn;
      counters[kn] = 0;
    }
    if ((counters[kn] ?? 0) >= cond.max) return false;
    counters[kn] = (counters[kn] ?? 0) + 1;
    return true;
  },
  describe: (cond) => `1ターンに${cond.max}回まで`,
};
