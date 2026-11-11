// ダメージ（hits 回。全体なら1回ごとに全員へ）
import { dealDamage, resolveTargets, targetOf } from '..';
import { getElement } from '../../../../data/elements';
import { getStatus } from '../../../../data/statuses';
import { isEnemy, nameOf } from '../../units';
import { chargedMultiplier } from '../../cardState';
import { type EffectHandler, upgradeAmount, recordActivation } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** element: 属性（src/content の elements の ID。省略は無属性） */
    damage: { amount: number; hits?: number; element?: string; outcomes?: { weight: number; multiplier: number }[] };
  }
}

export const effect: EffectHandler<'damage'> = {
  kind: 'damage',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    let multiplier = 1;
    if (e.outcomes?.length) {
      let roll = ctx.rng.next() * e.outcomes.reduce((n, o) => n + o.weight, 0);
      for (const o of e.outcomes) { multiplier = o.multiplier; roll -= o.weight; if (roll < 0) break; }
      ctx.parts.push(`勝負×${multiplier}`);
    }
    const multi = (e.hits ?? 1) >= 2 && !isEnemy(ctx.source) ? (ctx.multi ??= { total: 0, landed: 0 }) : undefined;
    for (let h = 0; h < (e.hits ?? 1); h++) {
      for (const t of resolveTargets(ctx, targetOf(e))) {
        const charge = chargedMultiplier(ctx.source, ctx.card);
        if (charge > 1) recordActivation(ctx, { name: '蓄えた力', source: { kind: 'other' } });
        const loss = dealDamage(ctx, t, e.amount, e.element, charge * multiplier);
        any = true;
        if (multi) {
          multi.total += 1;
          if (loss > 0) multi.landed += 1;
        }
        if (isEnemy(ctx.source)) ctx.parts.push(`${nameOf(t)}に${loss}`);
      }
    }
    return any;
  },
  describe(e, who) {
    const el = e.element ? getElement(e.element) : undefined;
    const st = el?.status ? `（${el.chance}%で${getStatus(el.status).name}${el.amount ?? 1}・完全成功なら必ず）` : '';
    const gamble = e.outcomes?.length ? `（${e.outcomes.map(o => `${o.weight}%で×${o.multiplier}`).join('／')}。1枚につき1回抽選）` : '';
    return `${who}${e.amount}の${el ? `${el.name}属性` : ''}ダメージ${(e.hits ?? 1) > 1 ? `×${e.hits}回` : ''}${st}${gamble}`;
  },
  short: (e) => `${e.outcomes?.length ? `${Math.floor(e.amount * Math.min(...e.outcomes.map(o => o.multiplier)))}〜${Math.floor(e.amount * Math.max(...e.outcomes.map(o => o.multiplier)))}` : e.amount}${(e.hits ?? 1) > 1 ? `×${e.hits}` : ''}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
