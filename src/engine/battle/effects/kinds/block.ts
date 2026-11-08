// ブロック（次の自分の側のフェーズ開始まで、ダメージを先に受け止める）
import { resolveTargets, targetOf } from '..';
import { isEnemy, unitIdOf } from '../../units';
import { type EffectHandler, upgradeAmount } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    block: { amount: number };
  }
}

export const effect: EffectHandler<'block'> = {
  kind: 'block',
  defaultTo: 'self',
  apply(ctx, e) {
    const ts = resolveTargets(ctx, targetOf(e));
    for (const t of ts) {
      t.block += e.amount;
      ctx.events.push({ type: 'block', unitId: unitIdOf(t), amount: e.amount });
    }
    if (isEnemy(ctx.source)) ctx.parts.push(ts.length ? `ブロック${e.amount}` : '（効果なし）');
    else ctx.parts.push(ts.length > 1 ? `全員${e.amount}ブロック` : `${e.amount}ブロック`);
    return ts.length > 0;
  },
  describe: (e, who) => (who === '自分に' ? `ブロック${e.amount}獲得` : `${who}ブロック${e.amount}`),
  short: (e) => `${e.amount}`,
  upgrade: (e) => ({ ...e, amount: upgradeAmount(e.amount) }),
};
