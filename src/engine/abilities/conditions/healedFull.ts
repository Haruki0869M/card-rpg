// 回復した相手のHPが、回復の前から満タンだった（きっかけ overheal で使う）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    healedFull: {};
  }
}

export const condition: ConditionHandler<'healedFull'> = {
  kind: 'healedFull',
  test: (c) => !!c.wasFull,
  describe: () => 'HPが満タンの味方を回復した時',
};
