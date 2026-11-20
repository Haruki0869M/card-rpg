// 自分に付いている状態異常を、全部まとめて対象に移す（呪い移し）
import { resolveTargets, targetOf } from '..';
import { fireAbilities } from '../../../abilities';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    moveStatus: { status: string };
  }
}

export const effect: EffectHandler<'moveStatus'> = {
  kind: 'moveStatus',
  defaultTo: 'target',
  apply(ctx, e) {
    const n = ctx.source.statuses[e.status] ?? 0;
    const t = resolveTargets(ctx, targetOf(e))[0];
    if (n <= 0 || !t || t === ctx.source) return false;
    ctx.source.statuses[e.status] = 0;
    addStatus(t.statuses, e.status, n);
    ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: e.status, amount: n });
    ctx.parts.push(`${getStatus(e.status).name}${n}を移した`);
    if (ctx.depth < 3 && isEnemy(ctx.source) !== isEnemy(t) && !ctx.source.dead) fireAbilities(ctx.state, ctx.rng, ctx.events, ctx.source, 'inflict', { target: t, statusId: e.status, depth: ctx.depth + 1 });
    return true;
  },
  describe: (e, who) => `自分の「${getStatus(e.status).name}」を${who}移す`,
};
