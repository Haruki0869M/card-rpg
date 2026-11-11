// HP回復
import { resolveTargets, targetOf } from '..';
import { fireAbilities } from '../../../abilities';
import { healUnit, isEnemy, nameOf, type Unit } from '../../units';
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
    // きっかけ: 回復がHPからあふれた（満タンの味方を回復した時も。朝の祈り）
    const over: { t: Unit; amount: number; wasFull: boolean }[] = [];
    for (const t of ts) {
      const wasFull = t.hp >= t.maxHp;
      const healed = healUnit(t, e.amount, ctx.events);
      total += healed;
      if (t.hp >= t.maxHp && healed < e.amount) over.push({ t, amount: e.amount - healed, wasFull });
    }
    if (ctx.depth < 3 && !isEnemy(ctx.source) && !ctx.source.dead)
      for (const o of over) if (!isEnemy(o.t)) fireAbilities(ctx.state, ctx.rng, ctx.events, ctx.source, 'overheal', { allyTarget: o.t, dealt: o.amount, wasFull: o.wasFull, depth: ctx.depth + 1 });
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
