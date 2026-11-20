// 戦闘のNターン目から（コソ泥が逃げるなど）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    turnAtLeast: { turn: number };
  }
}

export const condition: ConditionHandler<'turnAtLeast'> = {
  kind: 'turnAtLeast',
  test: (c, cond) => (c.state?.turn ?? 1) >= cond.turn,
  describe: (cond) => `戦闘の${cond.turn}ターン目から`,
};
