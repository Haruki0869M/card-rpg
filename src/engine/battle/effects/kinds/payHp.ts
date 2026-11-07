import { loseHp } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { payHp: { amount: number } } }
export const effect: EffectHandler<'payHp'> = {
  kind: 'payHp', defaultTo: 'self',
  apply: (ctx, e) => loseHp(ctx.state, ctx.source, e.amount, ctx.rng, ctx.events) > 0,
  describe: (e) => `自分のHPを${e.amount}失う`,
  short: e => `HP-${e.amount}`,
};
