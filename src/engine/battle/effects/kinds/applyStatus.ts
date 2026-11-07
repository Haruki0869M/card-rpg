// 状態異常を付ける（状態異常の種類は src/content の statuses）
import { resolveTargets, targetOf } from '..';
import { statusBonusOf } from '../../../abilities';
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
    // 相手に付ける時は、自分の能力（呪詛など）で量が増える
    const bonus = ts.some((t) => isEnemy(ctx.source) !== isEnemy(t)) ? statusBonusOf(ctx.source, e.status, ctx.card) : 0;
    const amount = e.amount + bonus;
    for (const t of ts) {
      const n = isEnemy(ctx.source) !== isEnemy(t) ? amount : e.amount;
      addStatus(t.statuses, e.status, n);
      if (isEnemy(ctx.source) !== isEnemy(t) && !ctx.hitIds.includes(unitIdOf(t))) ctx.hitIds.push(unitIdOf(t));
      ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: e.status, amount: n });
    }
    if (ts.length) {
      const name = `${getStatus(e.status).name}${amount}`;
      if (isEnemy(ctx.source)) ctx.parts.push(`${ts.length > 1 ? '全員' : nameOf(ts[0])}に${name}`);
      else ctx.parts.push(name);
    }
    return ts.length > 0;
  },
  describe: (e, who) => `${who}「${getStatus(e.status).name}」${e.amount}`,
  short: (e) => `${e.amount}`,
};
