// 今使ったカードに払ったマナを返す（陣割り）。払った量は、カードを使う時に counters.lastCost に覚えている
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    refundCost: object;
  }
}

export const effect: EffectHandler<'refundCost'> = {
  kind: 'refundCost',
  defaultTo: 'self',
  apply(ctx) {
    const u = ctx.source;
    if (isEnemy(u)) return false;
    const n = u.counters?.lastCost ?? 0;
    if (n <= 0) return false;
    u.mana += n;
    ctx.events.push({ type: 'resource', unitId: u.id, resource: 'mana', amount: n });
    ctx.parts.push('マナ+' + n);
    return true;
  },
  describe: () => 'そのカードのマナを返す',
};
