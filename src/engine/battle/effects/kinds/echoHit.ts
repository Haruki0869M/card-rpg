// 追加の一撃: このカードでHPに与えたダメージの pct% を、同じ相手にもう一度与える（剣豪の見切りなど）
import { dealDamage, resolveTargets, targetOf } from '..';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    echoHit: { pct: number };
  }
}

export const effect: EffectHandler<'echoHit'> = {
  kind: 'echoHit',
  defaultTo: 'target',
  apply(ctx, e) {
    const base = Math.round((ctx.dealt * e.pct) / 100);
    if (base <= 0) return false;
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const loss = dealDamage(ctx, t, base);
      ctx.parts.push(`追撃${loss}`);
      any = true;
    }
    return any;
  },
  describe: (e, who) => `${who}与えたダメージの${e.pct}%で追加の一撃`,
  short: (e) => `追${e.pct}%`,
};
