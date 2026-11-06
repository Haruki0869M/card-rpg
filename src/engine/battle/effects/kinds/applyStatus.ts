// 状態異常を付ける（状態異常の種類は src/content の statuses）
import { resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    applyStatus: { status: string; amount: number };
  }
}

export const effect: EffectHandler<'applyStatus'> = {
  kind: 'applyStatus',
  defaultTo: 'target',
  apply(ctx, e) {
    const ts = resolveTargets(ctx, targetOf(e));
    for (const t of ts) {
      addStatus(t.statuses, e.status, e.amount);
      if (isEnemy(ctx.source) !== isEnemy(t) && !ctx.hitIds.includes(unitIdOf(t))) ctx.hitIds.push(unitIdOf(t));
      ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: e.status, amount: e.amount });
    }
    if (ts.length) {
      const name = `${getStatus(e.status).name}${e.amount}`;
      if (isEnemy(ctx.source)) ctx.parts.push(`${ts.length > 1 ? '全員' : nameOf(ts[0])}に${name}`);
      else ctx.parts.push(name);
    }
    return ts.length > 0;
  },
  describe: (e, who) => `${who}「${getStatus(e.status).name}」${e.amount}`,
  short: (e) => `${e.amount}`,
};
