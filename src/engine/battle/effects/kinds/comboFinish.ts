// 締めの拳（闘士）: amount ＋ このターンに使った category のカード1枚につき per（最大 +max）のダメージ。このカード自身は数えない
import { applyEffect } from '..';
import { CATEGORY_LABEL } from '../../../../data/terms';
import { isEnemy } from '../../units';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    comboFinish: { amount: number; per: number; max: number; category: CardCategory };
  }
}

export const effect: EffectHandler<'comboFinish'> = {
  kind: 'comboFinish',
  defaultTo: 'target',
  apply(ctx, e) {
    const n = isEnemy(ctx.source) ? 0 : ctx.source.playedBy?.[e.category] ?? 0;
    return applyEffect(ctx, { kind: 'damage', amount: e.amount + Math.min(e.max, n * e.per) });
  },
  describe: (e, who) => `${who}${e.amount}のダメージ。このターンに使った${CATEGORY_LABEL[e.category]}カード1枚につき+${e.per}（最大+${e.max}）`,
  short: (e) => `${e.amount}+`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
