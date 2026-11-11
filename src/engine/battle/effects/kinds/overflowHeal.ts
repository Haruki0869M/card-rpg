// 溢れる祝福（区切りD）: 回復し、最大HPを超えた分を、対象のブロックと自分の聖光（あふれ per ごとに1）にする
import { resolveTargets, targetOf } from '..';
import { BALANCE } from '../../../../data/balance';
import { healUnit, nameOf, unitIdOf } from '../../units';
import { addHolyLight } from './holyGain';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    overflowHeal: { amount: number; per: number };
  }
}

export const effect: EffectHandler<'overflowHeal'> = {
  kind: 'overflowHeal',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const healed = healUnit(t, e.amount, ctx.events);
      const over = e.amount - healed;
      if (healed > 0) ctx.parts.push(`${nameOf(t)}のHP+${healed}`);
      if (over > 0) {
        t.block = Math.min(BALANCE.blockMax, t.block + over);
        ctx.events.push({ type: 'block', unitId: unitIdOf(t), amount: over });
        const light = addHolyLight(ctx.source, Math.floor(over / e.per), ctx.events);
        ctx.parts.push(`あふれた${over}をブロックに${light ? `・聖光+${light}` : ''}`);
      }
      any = any || healed > 0 || over > 0;
    }
    return any;
  },
  describe: (e, who) => `${who === '自分に' ? '' : who.replace(/に$/, 'の')}HPを${e.amount}回復。あふれた分は、その味方のブロックになり、あふれ${e.per}ごとに自分に「聖光」+1`,
  short: (e) => `${e.amount}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
