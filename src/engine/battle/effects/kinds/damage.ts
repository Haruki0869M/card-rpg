// ダメージ（hits 回。全体なら1回ごとに全員へ）
import { dealDamage, resolveTargets, targetOf } from '..';
import { getElement } from '../../../../data/elements';
import { getStatus } from '../../../../data/statuses';
import { isEnemy, nameOf } from '../../units';
import { chargedMultiplier } from '../../cardState';
import { type EffectHandler, upgradeAmount } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** element: 属性（src/content の elements の ID。省略は無属性） */
    damage: { amount: number; hits?: number; element?: string };
  }
}

export const effect: EffectHandler<'damage'> = {
  kind: 'damage',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (let h = 0; h < (e.hits ?? 1); h++) {
      for (const t of resolveTargets(ctx, targetOf(e))) {
        const charge = chargedMultiplier(ctx.source, ctx.card);
        if (charge > 1 && !ctx.fired.includes('蓄えた力')) ctx.fired.push('蓄えた力');
        const loss = dealDamage(ctx, t, e.amount, e.element, charge);
        any = true;
        if (isEnemy(ctx.source)) ctx.parts.push(`${nameOf(t)}に${loss}`);
      }
    }
    return any;
  },
  describe(e, who) {
    const el = e.element ? getElement(e.element) : undefined;
    const st = el?.status ? `（${el.chance}%で${getStatus(el.status).name}${el.amount ?? 1}・完全成功なら必ず）` : '';
    return `${who}${e.amount}の${el ? `${el.name}属性` : ''}ダメージ${(e.hits ?? 1) > 1 ? `×${e.hits}回` : ''}${st}`;
  },
  short: (e) => `${e.amount}${(e.hits ?? 1) > 1 ? `×${e.hits}` : ''}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
