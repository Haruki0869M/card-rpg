// 戦闘のNターン目まで（突撃など）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    turnAtMost: { turn: number };
  }
}

export const condition: ConditionHandler<'turnAtMost'> = {
  kind: 'turnAtMost',
  test: (c, cond) => (c.state?.turn ?? 1) <= cond.turn,
  describe: (cond) => (cond.turn === 1 ? '戦闘の1ターン目' : `戦闘の${cond.turn}ターン目まで`),
};
