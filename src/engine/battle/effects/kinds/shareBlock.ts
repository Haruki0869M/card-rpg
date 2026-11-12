// 区切りF: 鉄の誓い（重装衛士）。ほかの味方に、自分の今のブロックの pct% のブロック（最大 max）
import { BALANCE } from '../../../../data/balance';
import { unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    shareBlock: { pct: number; max: number };
  }
}

export const effect: EffectHandler<'shareBlock'> = {
  kind: 'shareBlock',
  defaultTo: 'otherAllies',
  apply(ctx, e) {
    const n = Math.min(e.max, Math.floor((ctx.source.block * e.pct) / 100));
    if (n <= 0) return false;
    let any = false;
    for (const a of ctx.state.allies) {
      if (a.dead || a === ctx.source) continue;
      a.block = Math.min(BALANCE.blockMax, a.block + n);
      ctx.events.push({ type: 'block', unitId: unitIdOf(a), amount: n });
      any = true;
    }
    if (any) ctx.parts.push(`仲間にブロック${n}`);
    return any;
  },
  describe: (e) => `ほかの味方全員に、自分の今のブロックの${e.pct}%のブロック（最大${e.max}）`,
};
