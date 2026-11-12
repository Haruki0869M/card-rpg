// 区切りF: 竜脈解放。amount ＋ 対象に付いている悪い状態異常1種類につき per のダメージ（状態異常は消えない）
import { dealDamage, resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    statusKindsDamage: { amount: number; per: number };
  }
}

export const effect: EffectHandler<'statusKindsDamage'> = {
  kind: 'statusKindsDamage',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const kinds = Object.entries(t.statuses).filter(([id, n]) => (n ?? 0) > 0 && getStatus(id).harmful).length;
      dealDamage(ctx, t, e.amount + kinds * e.per);
      any = true;
    }
    return any;
  },
  describe: (e, who) => `${who}${e.amount}＋悪い状態異常1種類につき${e.per}のダメージ（状態異常は消えない）`,
  short: (e) => `${e.amount}+`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
