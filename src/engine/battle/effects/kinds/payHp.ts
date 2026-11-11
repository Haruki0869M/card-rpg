import { loseHp } from '../../units';
import type { EffectHandler } from '../types';
// pct = 今のHPの割合で払う（捨て身の覚醒。区切りD。切り捨て・最低1）
declare module '../../../../types' { interface EffectParams { payHp: { amount?: number; pct?: number } } }
const amountOf = (hp: number, e: { amount?: number; pct?: number }) => e.pct ? Math.max(1, Math.floor((hp * e.pct) / 100)) : (e.amount ?? 0);
export const effect: EffectHandler<'payHp'> = {
  kind: 'payHp', defaultTo: 'self',
  apply: (ctx, e) => loseHp(ctx.state, ctx.source, amountOf(ctx.source.hp, e), ctx.rng, ctx.events) > 0,
  check: (ctx, e) => ctx.source.hp <= amountOf(ctx.source.hp, e) ? 'HPを払うと戦闘不能になります' : null,
  describe: (e) => e.pct ? `自分のHPを今の${e.pct}%失う` : `自分のHPを${e.amount}失う`,
  short: e => e.pct ? `HP-${e.pct}%` : `HP-${e.amount}`,
};
