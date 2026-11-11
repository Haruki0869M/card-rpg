// 反転の呪印（区切りD）: このターン、自分の「味方1人を回復するカード」は、回復の代わりに、この敵へ回復量の pct% の聖ダメージ（最大 max）
import { resolveTargets, targetOf } from '..';
import { isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    reversal: { pct: number; max: number };
  }
}

export const effect: EffectHandler<'reversal'> = {
  kind: 'reversal',
  defaultTo: 'target',
  apply(ctx, e) {
    const src = ctx.source;
    if (isEnemy(src)) return false;
    const t = resolveTargets(ctx, targetOf(e)).find((u) => isEnemy(u));
    if (!t) return false;
    src.reversal = { targetId: unitIdOf(t), pct: e.pct, max: e.max, turn: ctx.state.turn };
    ctx.parts.push(`${nameOf(t)}に反転の呪印`);
    return true;
  },
  describe: (e, who) => `このターン、自分の「味方1人を回復するカード」は、回復の代わりに${who.replace(/に$/, '')}へ回復量の${e.pct}%の聖属性ダメージ（1回最大${e.max}）`,
};
