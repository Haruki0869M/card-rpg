// 吸収: このカード・能力でHPに与えたダメージの pct% だけ回復
import { resolveTargets, targetOf } from '..';
import { healUnit } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    healPctOfDealt: { pct: number; /** 回復の上限 */ max?: number };
  }
}

export const effect: EffectHandler<'healPctOfDealt'> = {
  kind: 'healPctOfDealt',
  defaultTo: 'self',
  apply(ctx, e) {
    const amount = Math.min(e.max ?? Infinity, Math.floor((ctx.dealt * e.pct) / 100));
    if (amount <= 0) return false;
    let total = 0;
    for (const t of resolveTargets(ctx, targetOf(e))) total += healUnit(t, amount, ctx.events);
    if (total > 0) ctx.parts.push(`HP+${total}`);
    return total > 0;
  },
  describe: (e, who) => `HPに与えたダメージの${e.pct}%だけ${who === '自分に' ? '' : who.replace(/に$/, 'の')}HPを回復${e.max !== undefined ? `（最大${e.max}）` : ''}`,
};
