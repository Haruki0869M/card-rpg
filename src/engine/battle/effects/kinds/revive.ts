import { isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { revive: { pct: number } } }
export const effect: EffectHandler<'revive'> = {
  kind: 'revive', defaultTo: 'target',
  apply(ctx, e) {
    const t = ctx.target;
    if (!t?.dead || isEnemy(t) !== isEnemy(ctx.source)) return false;
    t.dead = false;
    t.hp = Math.max(1, Math.round(t.maxHp * e.pct / 100));
    ctx.events.push({ type: 'heal', unitId: unitIdOf(t), amount: t.hp });
    ctx.parts.push(`HP${t.hp}で復活`);
    return true;
  },
  describe: (e) => `倒れた味方をHP${e.pct}%で復活させる`,
};
