// なでなで（調教師）: HPを amount 回復。HPが満タンの時は、代わりにブロック block（オーナーの決定 2026-11-12）
import { resolveTargets, targetOf } from '..';
import { BALANCE } from '../../../../data/balance';
import { healUnit, nameOf, unitIdOf } from '../../units';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    healOrBlock: { amount: number; block: number };
  }
}

export const effect: EffectHandler<'healOrBlock'> = {
  kind: 'healOrBlock',
  defaultTo: 'self',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (t.hp >= t.maxHp) {
        t.block = Math.min(BALANCE.blockMax, t.block + e.block);
        ctx.events.push({ type: 'block', unitId: unitIdOf(t), amount: e.block });
        ctx.parts.push(`${e.block}ブロック`);
        any = true;
        continue;
      }
      const healed = healUnit(t, e.amount, ctx.events);
      if (healed > 0) ctx.parts.push(`${nameOf(t)}のHP+${healed}`);
      any = any || healed > 0;
    }
    return any;
  },
  describe: (e) => `HPを${e.amount}回復（HPが満タンの時は、代わりにブロック${e.block}）`,
  short: (e) => `${e.amount}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
