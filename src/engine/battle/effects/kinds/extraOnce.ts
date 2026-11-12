// 「1ターンに1回」の力（key）を、このターンだけ、もう1回使えるようにする（天剣: 《二の太刀》をもう1回）。
// oncePerTurn の条件が、使い切った後にこの印を1つ使って通す。印は重ならない（1ターンに足せるのは1回まで）
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    extraOnce: { key: string; label: string };
  }
}

export const effect: EffectHandler<'extraOnce'> = {
  kind: 'extraOnce',
  defaultTo: 'self',
  apply(ctx, e) {
    if (isEnemy(ctx.source)) return false;
    const cs = (ctx.source.counters ??= {});
    // このターンにもう足していたら、足さない（《二の太刀》で天剣がくり返されても、増え続けない）
    if (cs[`onceExtraGiven:${e.key}`] === ctx.state.turn) return false;
    cs[`onceExtraGiven:${e.key}`] = ctx.state.turn;
    cs[`onceExtra:${e.key}`] = ctx.state.turn;
    ctx.parts.push(`${e.label}をもう1回`);
    return true;
  },
  describe: (e) => `このターン、${e.label}をもう1回出せる（1ターンに1回）`,
};
