// 総崩れ（区切りD）: 対象の悪い状態異常を全部消し、消した種類1つにつきダメージ×(1+per)（最大×max）で amount のダメージ
import { dealDamage, resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    collapse: { amount: number; per: number; max: number };
  }
}

export const effect: EffectHandler<'collapse'> = {
  kind: 'collapse',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      let kinds = 0;
      for (const [id, n] of Object.entries(t.statuses)) if ((n ?? 0) > 0 && getStatus(id).harmful) { t.statuses[id as keyof typeof t.statuses] = 0; kinds += 1; }
      const mul = Math.min(e.max, 1 + e.per * kinds);
      if (kinds) ctx.parts.push(`総崩れ×${Math.round(mul * 100) / 100}`);
      dealDamage(ctx, t, e.amount, undefined, mul);
      any = true;
    }
    return any;
  },
  describe: (e, who) => `${who.replace(/に$/, 'の')}悪い状態異常を全部消し、${e.amount}のダメージ。消した種類1つにつきダメージ×${1 + e.per}ずつ（最大×${e.max}）`,
  short: (e) => `${e.amount}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
