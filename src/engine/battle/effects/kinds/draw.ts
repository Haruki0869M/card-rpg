// カードを引く（味方のみ）
import { resolveTargets, targetOf } from '..';
import { drawCards } from '../../deck';
import { addLog, isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    draw: { amount: number };
  }
}

export const effect: EffectHandler<'draw'> = {
  kind: 'draw',
  defaultTo: 'self',
  apply(ctx, e) {
    let total = 0;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (isEnemy(t)) continue;
      const { drawn, reshuffled } = drawCards(t, e.amount, ctx.rng);
      if (reshuffled) addLog(ctx.state, `${t.name}: 捨札をシャッフルして山札に戻した`);
      total += drawn;
    }
    ctx.parts.push(`${total}枚ドロー`);
    return total > 0;
  },
  describe: (e, who) => `${who === '自分に' ? '' : who}カードを${e.amount}枚引く`,
  short: (e) => `+${e.amount}`,
};
