// 今のカードが完全成功の時（剣士の剣の心得など。ダメージの計算の時だけ分かる）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    perfect: {};
  }
}

export const condition: ConditionHandler<'perfect'> = {
  kind: 'perfect',
  test: (c) => !!c.perfect,
  describe: () => '完全成功の時',
};
