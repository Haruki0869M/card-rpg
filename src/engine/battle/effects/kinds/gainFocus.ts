// フォーカス回復（味方のみ。最大値まで）
import { resolveTargets, targetOf } from '..';
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    gainFocus: { amount: number };
  }
}

export const effect: EffectHandler<'gainFocus'> = {
  kind: 'gainFocus',
  defaultTo: 'self',
  apply(ctx, e) {
    let total = 0;
    let n = 0;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (isEnemy(t)) continue;
      n++;
      const before = t.focus;
      t.focus = Math.min(t.focusMax, t.focus + e.amount);
      total += t.focus - before;
    }
    if (n) ctx.parts.push(n === 1 && ctx.target && ctx.target !== ctx.source ? `${nameOf(ctx.target)}のフォーカス+${total}` : `フォーカス+${total}`);
    return total > 0;
  },
  check(ctx, e) {
    const ts = resolveTargets(ctx, targetOf(e)).filter((t) => !isEnemy(t));
    return ts.every((t) => !isEnemy(t) && t.focus >= t.focusMax) ? 'フォーカスは最大です' : null;
  },
  describe: (e, who) => `${who === '自分に' ? '' : who.replace(/に$/, 'の')}フォーカス+${e.amount}`,
  short: (e) => `+${e.amount}`,
};
