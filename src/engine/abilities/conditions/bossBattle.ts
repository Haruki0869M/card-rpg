// ボス・中ボスの部屋の戦闘の間
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    bossBattle: object;
  }
}

export const condition: ConditionHandler<'bossBattle'> = {
  kind: 'bossBattle',
  test: (c) => !!c.state && (!!c.state.boss || !!c.state.midboss),
  describe: () => 'ボス・中ボスとの戦闘中',
};
