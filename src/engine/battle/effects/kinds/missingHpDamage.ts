// 逆境の刃（区切りD）: amount ＋ 自分の減っているHPの pct%（最大+max）のダメージ
import { dealDamage, resolveTargets, targetOf } from '..';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    missingHpDamage: { amount: number; pct: number; max: number };
  }
}

export const effect: EffectHandler<'missingHpDamage'> = {
  kind: 'missingHpDamage',
  defaultTo: 'target',
  apply(ctx, e) {
    const extra = Math.min(e.max, Math.floor(((ctx.source.maxHp - ctx.source.hp) * e.pct) / 100));
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      dealDamage(ctx, t, e.amount + extra);
      any = true;
    }
    return any;
  },
  describe: (e, who) => `${who}${e.amount}＋自分の減っているHPの${e.pct}%（最大+${e.max}）のダメージ`,
  short: (e) => `${e.amount}+`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
