// 聖光解放・セラフィム（区切りD）: 自分の聖光を全部使い、1つにつき聖ダメージ+per%。使った時、味方全員を heal 回復
// 聖光のふだんの上乗せ（+15%）とは重ねない（先に聖光を0にしてから撃つ）
import { dealDamage, resolveTargets, targetOf } from '..';
import { healUnit } from '../../units';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    seraphim: { amount: number; per: number; heal: number };
  }
}

export const effect: EffectHandler<'seraphim'> = {
  kind: 'seraphim',
  defaultTo: 'target',
  apply(ctx, e) {
    const n = ctx.source.statuses.holyLight ?? 0;
    ctx.source.statuses.holyLight = 0;
    const mul = 1 + (e.per / 100) * n;
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) { dealDamage(ctx, t, e.amount, 'holy', mul); any = true; }
    if (n > 0) {
      ctx.parts.push(`聖光${n}を解放`);
      for (const a of ctx.state.allies) if (!a.dead) healUnit(a, e.heal, ctx.events);
    }
    return any;
  },
  describe: (e, who) => `${who}${e.amount}の聖属性ダメージ。自分の「聖光」を全部使い、1つにつきダメージ+${e.per}%（聖光のふだんの上乗せは重ならない）。聖光を使ったら、味方全員のHPを${e.heal}回復`,
  short: (e) => `${e.amount}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
