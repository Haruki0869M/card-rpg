// 状態異常を起爆して消す: 対象の状態異常を全部消し、消した数 × damagePer のダメージを与える。
// きっかけ「起爆して消した時」（detonate）を、使った人に起こす（dealt = 消した数。呪い刈り）
import { dealDamage, resolveTargets, targetOf } from '..';
import { fireAbilities } from '../../../abilities';
import { getStatus } from '../../../../data/statuses';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    detonateStatus: { status: string; damagePer?: number };
  }
}

export const effect: EffectHandler<'detonateStatus'> = {
  kind: 'detonateStatus',
  defaultTo: 'target',
  apply(ctx, e) {
    let total = 0;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const n = t.statuses[e.status] ?? 0;
      if (n <= 0) continue;
      t.statuses[e.status] = 0;
      total += n;
      if (e.damagePer) dealDamage(ctx, t, n * e.damagePer);
    }
    if (total <= 0) return false;
    ctx.parts.push(`${getStatus(e.status).name}${total}を起爆`);
    if (ctx.depth < 3 && !ctx.source.dead) fireAbilities(ctx.state, ctx.rng, ctx.events, ctx.source, 'detonate', { statusId: e.status, dealt: total, depth: ctx.depth + 1 });
    return true;
  },
  describe: (e, who) => `${who.replace(/に$/, 'の')}「${getStatus(e.status).name}」を全部起爆して消す${e.damagePer ? `（消した1つにつき${e.damagePer}ダメージ）` : ''}`,
};
