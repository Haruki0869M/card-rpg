// 対象の継続ダメージ（火傷など）を、今すぐ1回起こす。状態異常の数は減らさない
import { resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { tickDamageOfStatus } from '../../statuses';
import { loseHp, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    tickNow: { status: string };
  }
}

export const effect: EffectHandler<'tickNow'> = {
  kind: 'tickNow',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const loss = loseHp(ctx.state, t, tickDamageOfStatus(t.statuses, e.status), ctx.rng, ctx.events);
      if (loss <= 0) continue;
      any = true;
      ctx.parts.push(`${nameOf(t)}に${getStatus(e.status).name}の${loss}ダメージ`);
    }
    return any;
  },
  describe: (e, who) => `${who}「${getStatus(e.status).name}」のダメージをすぐに1回与える`,
};
