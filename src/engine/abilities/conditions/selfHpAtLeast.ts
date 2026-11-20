// 自分のHPが pct% 以上（100 = HPが満タン）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    selfHpAtLeast: { pct: number };
  }
}

export const condition: ConditionHandler<'selfHpAtLeast'> = {
  kind: 'selfHpAtLeast',
  test: (c, cond) => !c.self.dead && c.self.hp * 100 >= c.self.maxHp * cond.pct,
  describe: (cond) => (cond.pct >= 100 ? 'HPが満タンの間' : `HPが${cond.pct}%以上の間`),
};
