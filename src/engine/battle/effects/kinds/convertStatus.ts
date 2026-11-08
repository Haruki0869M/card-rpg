// 状態異常 status をすべて別の状態異常 into に変える（量はそのまま。毒→火傷など）
import { resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    convertStatus: { status: string; into: string };
  }
}

export const effect: EffectHandler<'convertStatus'> = {
  kind: 'convertStatus',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const n = t.statuses[e.status] ?? 0;
      if (n <= 0) continue;
      t.statuses[e.status] = 0;
      addStatus(t.statuses, e.into, n);
      ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: e.into, amount: n });
      any = true;
    }
    if (any) ctx.parts.push(`${getStatus(e.status).name}が${getStatus(e.into).name}に変わった`);
    return any;
  },
  describe: (e, who) => `${who}「${getStatus(e.status).name}」を「${getStatus(e.into).name}」に変える`,
};
