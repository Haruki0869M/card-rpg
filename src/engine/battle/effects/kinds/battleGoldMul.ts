// 区切りE: 黄金の招き猫。この戦闘で得るお金を mul 倍にする（重ねても大きい方だけ）
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    battleGoldMul: { mul: number };
  }
}

export const effect: EffectHandler<'battleGoldMul'> = {
  kind: 'battleGoldMul',
  defaultTo: 'self',
  apply(ctx, e) {
    if ((ctx.state.goldMul ?? 1) >= e.mul) return false;
    ctx.state.goldMul = e.mul;
    ctx.parts.push(`この戦闘のお金×${e.mul}`);
    return true;
  },
  check: (ctx, e) => ((ctx.state.goldMul ?? 1) >= e.mul ? 'この戦闘では、もう使っています' : null),
  describe: (e) => `この戦闘で得るお金×${e.mul}`,
};
