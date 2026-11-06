// 相手（対象）のHPが pct% 以下
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    targetHpAtMost: { pct: number };
  }
}

export const condition: ConditionHandler<'targetHpAtMost'> = {
  kind: 'targetHpAtMost',
  test: (c, cond) => !!c.target && c.target.hp * 100 <= c.target.maxHp * cond.pct,
  describe: (cond) => `対象のHPが${cond.pct}%以下なら`,
};
