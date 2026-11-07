import { resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { unitIdOf } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { fullRestore: { unused?: never } } }
export const effect: EffectHandler<'fullRestore'> = {
  kind: 'fullRestore', defaultTo: 'allies',
  apply(ctx, e) {
    for (const t of resolveTargets(ctx, targetOf(e))) {
      for (const id of Object.keys(t.statuses)) if (getStatus(id).harmful) t.statuses[id] = 0;
      const amount = t.maxHp - t.hp;
      t.hp = t.maxHp;
      ctx.events.push({ type: 'heal', unitId: unitIdOf(t), amount });
    }
    ctx.parts.push('HPと状態異常を全回復');
    return true;
  },
  describe: () => '味方全員のHPと悪い状態異常を全回復',
  short: () => '回復',
};
