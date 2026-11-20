import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { chargeAttack: { factor: number; max: number; category: CardCategory } } }
export const effect: EffectHandler<'chargeAttack'> = {
  kind: 'chargeAttack', defaultTo: 'self',
  apply(ctx, e) {
    if (isEnemy(ctx.source)) return false;
    const old = ctx.source.attackCharge?.category === e.category ? ctx.source.attackCharge.multiplier : 1;
    const multiplier = Math.min(e.max, old * e.factor);
    if (old === multiplier) return false;
    ctx.source.attackCharge = { multiplier, category: e.category };
    ctx.parts.push(`次の攻撃×${multiplier}`);
    return true;
  },
  describe: e => `次の${e.category === 'physical' ? '物理' : '魔法'}攻撃カードの威力を${e.factor}倍に蓄える（最大${e.max}倍）`,
};
