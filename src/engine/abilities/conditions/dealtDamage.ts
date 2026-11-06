// HPにダメージを与えた（カードを使った後など）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    dealtDamage: {};
  }
}

export const condition: ConditionHandler<'dealtDamage'> = {
  kind: 'dealtDamage',
  test: (c) => (c.dealt ?? 0) > 0,
  describe: () => 'ダメージを与えた時',
};
