// このターンに、このカードの前にカードを何枚使ったか（連撃など）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    playedThisTurn: { atLeast: number };
  }
}

export const condition: ConditionHandler<'playedThisTurn'> = {
  kind: 'playedThisTurn',
  test: (c, cond) => ((c.self as { played?: number }).played ?? 0) >= cond.atLeast,
  describe: (cond) => `そのターンの${cond.atLeast + 1}枚目から`,
};
