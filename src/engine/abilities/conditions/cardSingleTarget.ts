// 敵1体を狙うカード（狙い撃ちなど）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    cardSingleTarget: {};
  }
}

export const condition: ConditionHandler<'cardSingleTarget'> = {
  kind: 'cardSingleTarget',
  test: (c) => c.card?.target === 'enemy',
  describe: () => '敵1体を狙うカード',
};
