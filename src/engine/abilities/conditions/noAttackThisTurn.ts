// このターンに、ダメージを与えるカードを1枚も使っていない
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    noAttackThisTurn: {};
  }
}

export const condition: ConditionHandler<'noAttackThisTurn'> = {
  kind: 'noAttackThisTurn',
  test: (c) => ((c.self as { counters?: Record<string, number> }).counters?.atkTurn ?? -1) !== (c.state?.turn ?? 0),
  describe: () => 'そのターンに攻撃カードを使わなかった時',
};
