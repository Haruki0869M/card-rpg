// 敵全体を狙うカード
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    cardAoe: object;
  }
}

export const condition: ConditionHandler<'cardAoe'> = {
  kind: 'cardAoe',
  test: (c) => c.card?.target === 'allEnemies',
  describe: () => '敵全体を狙うカード',
};
