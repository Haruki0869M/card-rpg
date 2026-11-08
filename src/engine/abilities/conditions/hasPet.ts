// お供を連れている
import { isEnemy } from '../../battle/units';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    hasPet: object;
  }
}

export const condition: ConditionHandler<'hasPet'> = {
  kind: 'hasPet',
  test: (c) => !isEnemy(c.self) && !!c.self.pet,
  describe: () => 'お供がいる間',
};
