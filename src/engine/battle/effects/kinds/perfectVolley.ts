// 追い矢（弓聖）: amount のダメージを、1回＋（このターンに完全成功したカードの枚数。最大 +max 回）当てる。このカード自身は数えない
import { applyEffect } from '..';
import { isEnemy } from '../../units';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    perfectVolley: { amount: number; max: number };
  }
}

export const effect: EffectHandler<'perfectVolley'> = {
  kind: 'perfectVolley',
  defaultTo: 'target',
  apply(ctx, e) {
    const cs = isEnemy(ctx.source) ? {} : ctx.source.counters ?? {};
    const n = cs.perfectTurn === ctx.state.turn ? cs.perfectCount ?? 0 : 0;
    return applyEffect(ctx, { kind: 'damage', amount: e.amount, hits: 1 + Math.min(e.max, n) });
  },
  describe: (e, who) => `${who}${e.amount}のダメージ。このターンに完全成功したカード1枚につき、もう1回当たる（最大+${e.max}回）`,
  short: (e) => `${e.amount}×`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
