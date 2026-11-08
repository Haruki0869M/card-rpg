// HP回復
import { resolveTargets, targetOf } from '..';
import { healUnit, nameOf } from '../../units';
import { type EffectHandler, upgradeAmount } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    heal: { amount: number };
  }
}

export const effect: EffectHandler<'heal'> = {
  kind: 'heal',
  defaultTo: 'target',
  apply(ctx, e) {
    const ts = resolveTargets(ctx, targetOf(e));
    let total = 0;
    for (const t of ts) total += healUnit(t, e.amount, ctx.events);
    if (ts.length > 1) ctx.parts.push(`全員のHP+${e.amount}`);
    else if (ts.length === 1 && total > 0) ctx.parts.push(`${nameOf(ts[0])}のHP+${total}`);
    return total > 0;
  },
  check(ctx, e) {
    const ts = resolveTargets(ctx, targetOf(e));
    return ts.every((t) => t.hp >= t.maxHp) ? 'HPは満タンです' : null;
  },
  describe: (e, who) => `${who === '自分に' ? '' : who.replace(/に$/, 'の')}HPを${e.amount}回復`,
  short: (e) => `${e.amount}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
