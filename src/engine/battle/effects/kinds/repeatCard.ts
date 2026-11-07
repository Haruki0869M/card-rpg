// 判定と支払いを繰り返さず、選ばれた段の効果だけを再発動する。
import { applyEffect } from '..';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { repeatCard: { unused?: never } } }
export const effect: EffectHandler<'repeatCard'> = {
  kind: 'repeatCard', defaultTo: 'target',
  apply(ctx) {
    if (!ctx.card || !ctx.tierEffects || ctx.depth >= 3) return false;
    const repeated = { ...ctx, depth: ctx.depth + 1 };
    for (const e of ctx.tierEffects) if (e.kind !== 'repeatCard') applyEffect(repeated, e);
    return true;
  },
  describe: () => '使ったカードの効果をもう一度発動',
};
