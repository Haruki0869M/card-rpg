// 流れる連撃（区切りD）: amount のダメージ ×（このターンに使ったコスト0のカードの枚数。最低1回・最大 max 回）
import { dealDamage, resolveTargets, targetOf } from '..';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    zeroFlurry: { amount: number; max: number };
  }
}

export const effect: EffectHandler<'zeroFlurry'> = {
  kind: 'zeroFlurry',
  defaultTo: 'target',
  apply(ctx, e) {
    const n = Math.max(1, Math.min(e.max, (ctx.source as { playedZero?: number }).playedZero ?? 0));
    let any = false;
    for (let i = 0; i < n; i++) {
      for (const t of resolveTargets(ctx, targetOf(e))) {
        dealDamage(ctx, t, e.amount);
        any = true;
      }
    }
    ctx.parts.push(`${n}連撃`);
    return any;
  },
  describe: (e, who) => `${who}${e.amount}のダメージ×（このターンに使ったコスト0のカードの枚数。最低1回・最大${e.max}回）`,
  short: (e) => `${e.amount}×N`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
