// 自分のHPが pct% 以下
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    selfHpAtMost: { pct: number };
  }
}

export const condition: ConditionHandler<'selfHpAtMost'> = {
  kind: 'selfHpAtMost',
  test: (c, cond) => !c.self.dead && c.self.hp * 100 <= c.self.maxHp * cond.pct,
  describe: (cond) => (cond.pct === 50 ? 'HPが半分以下の間' : `HPが${cond.pct}%以下の間`),
};
