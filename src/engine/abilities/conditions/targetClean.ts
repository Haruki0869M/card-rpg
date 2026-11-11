// 対象に悪い状態異常が1つも無い
import { hasHarmful } from '../../battle/statuses';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    targetClean: {};
  }
}

export const condition: ConditionHandler<'targetClean'> = {
  kind: 'targetClean',
  test: (c) => !!c.target && !hasHarmful(c.target.statuses),
  describe: () => '悪い状態異常が無い相手',
};
