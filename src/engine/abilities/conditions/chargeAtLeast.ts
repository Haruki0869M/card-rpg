// 《居合》などで蓄えた「次の攻撃の倍率」が multiplier 以上（奥義・月下断）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    chargeAtLeast: { multiplier: number };
  }
}

export const condition: ConditionHandler<'chargeAtLeast'> = {
  kind: 'chargeAtLeast',
  test: (c, cond) => ((c.self as { attackCharge?: { multiplier: number } }).attackCharge?.multiplier ?? 1) >= cond.multiplier,
  describe: (cond) => `蓄えた倍率が${cond.multiplier}倍以上の時`,
};
