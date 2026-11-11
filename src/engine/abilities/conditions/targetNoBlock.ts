// 対象にブロックが無い時
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    targetNoBlock: object;
  }
}

export const condition: ConditionHandler<'targetNoBlock'> = {
  kind: 'targetNoBlock',
  test: (c) => !!c.target && c.target.block <= 0,
  describe: () => 'ブロックが無い相手',
};
