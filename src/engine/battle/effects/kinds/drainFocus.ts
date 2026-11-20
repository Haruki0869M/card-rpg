// フォーカスを奪う（味方のフォーカスを減らす。0より下にはならない）。敵の行動で使う
import { resolveTargets, targetOf } from '..';
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    drainFocus: { amount: number };
  }
}

export const effect: EffectHandler<'drainFocus'> = {
  kind: 'drainFocus',
  defaultTo: 'target',
  apply(ctx, e) {
    const lost: string[] = [];
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (isEnemy(t)) continue;
      const n = Math.min(t.focus, Math.max(0, e.amount));
      if (n <= 0) continue;
      t.focus -= n;
      ctx.events.push({ type: 'resource', unitId: t.id, resource: 'focus', amount: -n });
      if (!ctx.hitIds.includes(t.id)) ctx.hitIds.push(t.id);
      lost.push(`${nameOf(t)}のフォーカス-${n}`);
    }
    ctx.parts.push(...lost);
    return lost.length > 0;
  },
  describe: (e, who) => `${who.replace(/に$/, 'の')}フォーカスを${e.amount}奪う（0より下にはならない）`,
  short: (e) => `-${e.amount}`,
};
