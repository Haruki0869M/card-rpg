import { resolveTargets, targetOf } from '..';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { rallyDamage: { amount: number; max: number } } }
export const effect: EffectHandler<'rallyDamage'> = {
  kind: 'rallyDamage', defaultTo: 'allies',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (isEnemy(t)) continue;
      const prev = t.damageBonus ?? 0;
      t.damageBonus = Math.min(e.max, prev + e.amount);
      any ||= t.damageBonus > prev;
    }
    return any;
  },
  describe: (e, who) => `${who}戦闘中の与ダメージ+${Math.round(e.amount * 100)}%（最大+${Math.round(e.max * 100)}%）`,
};
