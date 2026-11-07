import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { jump: { amount: number } } }
export const effect: EffectHandler<'jump'> = {
  kind: 'jump', defaultTo: 'self',
  apply(ctx, e) {
    if (isEnemy(ctx.source) || !ctx.target || !isEnemy(ctx.target)) return false;
    ctx.source.airborne = { targetId: ctx.target.uid, amount: e.amount, turn: ctx.state.turn + 1 };
    ctx.parts.push('跳躍した');
    return true;
  },
  describe: (e) => `次の敵フェーズの攻撃を受けず、次のターンに${e.amount}ダメージ`,
  short: e => `跳${e.amount}`,
};
