// お供のおやつ（K2）: お供の懐き度を増やす。戦闘の外でだけ使える（戦闘の外の処理は outcomes/kinds/feedPet.ts）
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    feedPet: { amount: number };
  }
}

export const effect: EffectHandler<'feedPet'> = {
  kind: 'feedPet',
  defaultTo: 'target',
  apply: () => false,
  check: () => 'お供のおやつは、戦闘の外で使います',
  describe: (e) => `お供の懐き度+${e.amount}（戦闘の外で使う）`,
};
