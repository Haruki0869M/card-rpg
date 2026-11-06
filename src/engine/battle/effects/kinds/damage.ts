// ダメージ（hits 回。全体なら1回ごとに全員へ）
import { dealDamage, resolveTargets, targetOf } from '..';
import { isEnemy, nameOf } from '../../units';
import { type EffectHandler, upgradeAmount } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    damage: { amount: number; hits?: number };
  }
}

export const effect: EffectHandler<'damage'> = {
  kind: 'damage',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (let h = 0; h < (e.hits ?? 1); h++) {
      for (const t of resolveTargets(ctx, targetOf(e))) {
        const loss = dealDamage(ctx, t, e.amount);
        any = true;
        if (isEnemy(ctx.source)) ctx.parts.push(`${nameOf(t)}に${loss}`);
      }
    }
    return any;
  },
  describe: (e, who) => `${who}${e.amount}ダメージ${(e.hits ?? 1) > 1 ? `×${e.hits}回` : ''}`,
  short: (e) => `${e.amount}${(e.hits ?? 1) > 1 ? `×${e.hits}` : ''}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
