import { applyEffect, dealDamage, resolveTargets, targetOf } from '..';
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
      // 攻撃は回数・属性を保って盗んだ敵へ返し、それ以外は自分が受け取る。
      for (const actionEffect of getEnemyAction(t.defId, t.intent.actionId).effects) {
        if (!('amount' in actionEffect)) continue;
        const amount = Math.floor(actionEffect.amount * remaining * (1 - e.multiplier));
        if (amount <= 0) continue;
        if (actionEffect.kind === 'damage') {
          for (let h = 0; h < (actionEffect.hits ?? 1); h++) dealDamage(ctx, t, amount, actionEffect.element);
        } else applyEffect(ctx, { ...actionEffect, amount, to: 'self' });
      }
      any = true;
    }
    return any;
  },
  describe: () => '敵の次の行動の数値を半分にし、その半分を奪う（攻撃は同じ回数・属性でその敵1体にダメージ、それ以外は自分が受け取る）',
  short: () => '半減',
};
