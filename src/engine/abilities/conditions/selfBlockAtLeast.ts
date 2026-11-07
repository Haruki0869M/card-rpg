// 自分のブロックが n 以上（子亀など: ブロックを得たターン）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    selfBlockAtLeast: { n: number };
  }
}

export const condition: ConditionHandler<'selfBlockAtLeast'> = {
  kind: 'selfBlockAtLeast',
  test: (c, cond) => c.self.block >= cond.n,
  describe: (cond) => (cond.n <= 1 ? 'ブロックがある時' : `ブロックが${cond.n}以上の時`),
};
