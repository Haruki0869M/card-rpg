// 戦闘中にお金を手に入れる（勝った時の報酬に足す。掠め取りなど）
import { fireAbilities } from '../../../abilities';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    gainGold: { amount: number };
  }
}

export const effect: EffectHandler<'gainGold'> = {
  kind: 'gainGold',
  defaultTo: 'self',
  apply(ctx, e) {
    ctx.state.bonusGold = (ctx.state.bonusGold ?? 0) + e.amount;
    ctx.parts.push(`${e.amount}G`);
    // 段階7b: きっかけ「戦闘中に自分がお金を得た」（強欲王の黄金冠。得た量を ctx.dealt で渡す）
    if (ctx.depth < 3 && !isEnemy(ctx.source) && !ctx.source.dead) fireAbilities(ctx.state, ctx.rng, ctx.events, ctx.source, 'goldGain', { dealt: e.amount, depth: ctx.depth + 1 });
    return true;
  },
  describe: (e) => `お金+${e.amount}（勝った時にもらえる）`,
  short: (e) => `${e.amount}G`,
};
