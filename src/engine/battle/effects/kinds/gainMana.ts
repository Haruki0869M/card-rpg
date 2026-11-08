// マナ回復（味方のみ）
import { resolveTargets, targetOf } from '..';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    gainMana: { amount: number };
  }
}

export const effect: EffectHandler<'gainMana'> = {
  kind: 'gainMana',
  defaultTo: 'self',
  apply(ctx, e) {
    const ts = resolveTargets(ctx, targetOf(e)).filter((t) => !isEnemy(t));
    for (const t of ts) if (!isEnemy(t)) { t.mana += e.amount; if (e.amount > 0) ctx.events.push({ type: 'resource', unitId: t.id, resource: 'mana', amount: e.amount }); }
    if (ts.length) ctx.parts.push(`マナ+${e.amount}`);
    return ts.length > 0;
  },
  describe: (e, who) => `${who === '自分に' ? '' : who}マナ+${e.amount}`,
  short: (e) => `+${e.amount}`,
};
