// 確率（%）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    chance: { pct: number };
  }
}

export const condition: ConditionHandler<'chance'> = {
  kind: 'chance',
  random: true,
  test(c, cond) {
    if (!c.rng) throw new Error('chance condition needs rng');
    return c.rng.next() * 100 < cond.pct;
  },
  describe: (cond) => `${cond.pct}%の確率`,
};
