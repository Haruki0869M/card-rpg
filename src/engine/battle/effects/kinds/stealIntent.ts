import { applyEffect, resolveTargets, targetOf } from '..';
import { getEnemyAction } from '../../../../data/enemies';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { stealIntent: { multiplier: number } } }
export const effect: EffectHandler<'stealIntent'> = {
  kind: 'stealIntent', defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (!isEnemy(t) || !t.intent) continue;
      const remaining = t.nextActionMultiplier ?? 1;
      t.nextActionMultiplier = remaining * e.multiplier;
      // 数値を持つ効果は同じ種類で自分が受け取る。攻撃の数値はブロックに換える。
      for (const actionEffect of getEnemyAction(t.defId, t.intent.actionId).effects) {
        if (!('amount' in actionEffect)) continue;
        const amount = Math.floor(actionEffect.amount * remaining * (1 - e.multiplier));
        if (amount <= 0) continue;
        if (actionEffect.kind === 'damage') applyEffect(ctx, { kind: 'block', amount: amount * (actionEffect.hits ?? 1), to: 'self' });
        else applyEffect(ctx, { ...actionEffect, amount, to: 'self' });
      }
      any = true;
    }
    return any;
  },
  describe: () => '敵の次の行動の数値を半分にし、その半分を自分が受け取る（攻撃はブロックに換える）',
  short: () => '半減',
};
