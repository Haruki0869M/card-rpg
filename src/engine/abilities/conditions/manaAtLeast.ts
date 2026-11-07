// 自分のマナが n 以上残っている（文鳥など）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    manaAtLeast: { n: number };
  }
}

export const condition: ConditionHandler<'manaAtLeast'> = {
  kind: 'manaAtLeast',
  test: (c, cond) => ((c.self as { mana?: number }).mana ?? 0) >= cond.n,
  describe: (cond) => `マナが${cond.n}以上余っていれば`,
};
