// 敵のブロックを壊して奪う（ブロック砕き。区切りD）。壊した量の stealPct% を自分のブロックにする
import { resolveTargets, targetOf } from '..';
import { BALANCE } from '../../../../data/balance';
import { isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    breakBlock: { amount: number; stealPct: number };
  }
}

export const effect: EffectHandler<'breakBlock'> = {
  kind: 'breakBlock',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (!isEnemy(t)) continue;
      const removed = Math.min(t.block, e.amount);
      if (removed <= 0) continue;
      t.block -= removed;
      const gain = Math.floor((removed * e.stealPct) / 100);
      if (gain > 0) {
        ctx.source.block = Math.min(BALANCE.blockMax, ctx.source.block + gain);
        ctx.events.push({ type: 'block', unitId: unitIdOf(ctx.source), amount: gain });
      }
      ctx.parts.push(`${nameOf(t)}のブロック-${removed}`);
      any = true;
    }
    return any;
  },
  describe: (e, who) => `先に${who.replace(/に$/, 'の')}ブロックを最大${e.amount}壊し、壊した量の${e.stealPct === 50 ? '半分' : `${e.stealPct}%`}を自分のブロックにする`,
};
