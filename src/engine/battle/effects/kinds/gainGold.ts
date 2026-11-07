// 戦闘中にお金を手に入れる（勝った時の報酬に足す。掠め取りなど）
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    gainGold: { amount: number };
  }
}

export const effect: EffectHandler<'gainGold'> = {
  kind: 'gainGold',
  defaultTo: 'self',
  apply(ctx, e) {
    ctx.state.bonusGold = (ctx.state.bonusGold ?? 0) + e.amount;
    ctx.parts.push(`${e.amount}G`);
    return true;
  },
  describe: (e) => `お金+${e.amount}（勝った時にもらえる）`,
  short: (e) => `${e.amount}G`,
};
