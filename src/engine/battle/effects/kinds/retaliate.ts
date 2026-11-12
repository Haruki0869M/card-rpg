// 反撃: 「ダメージを受けた時（hurt）」のきっかけで、攻撃してきた相手に damage を返す。
// 攻撃者がいない（毒などの継続ダメージ）・すでに倒れている・同じ側（味方どうし）の時は何もしない。
// perTurn: 1ターンに反撃する回数の上限（連続攻撃のカードで何度も返さないように。省略は上限なし）
import { dealDamage } from '..';
import { getElement } from '../../../../data/elements';
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** team = 味方みんなで数える回数の名前（茨の誓い: みんなで1ターン4回まで）。perTurn と一緒に使う */
    retaliate: { amount: number; element?: string; perTurn?: number; team?: string };
  }
}

type Counters = { counters?: Record<string, number> };

export const effect: EffectHandler<'retaliate'> = {
  kind: 'retaliate',
  defaultTo: 'self',
  apply(ctx, e) {
    const foe = ctx.attacker;
    if (!foe || foe.dead || foe === ctx.source || isEnemy(foe) === isEnemy(ctx.source)) return false;
    if (e.perTurn !== undefined && e.team) {
      const c = (ctx.state.teamCounters ??= {});
      const kt = `retaliate:${e.team}:turn`, kn = `retaliate:${e.team}:n`;
      if (c[kt] !== ctx.state.turn) { c[kt] = ctx.state.turn; c[kn] = 0; }
      if ((c[kn] ?? 0) >= e.perTurn) return false;
      c[kn] = (c[kn] ?? 0) + 1;
    } else if (e.perTurn !== undefined) {
      const c = ((ctx.source as Counters).counters ??= {});
      if (c.retaliateTurn !== ctx.state.turn) { c.retaliateTurn = ctx.state.turn; c.retaliateCount = 0; }
      if ((c.retaliateCount ?? 0) >= e.perTurn) return false;
      c.retaliateCount = (c.retaliateCount ?? 0) + 1;
    }
    const loss = dealDamage(ctx, foe, e.amount, e.element);
    ctx.parts.push(`${nameOf(foe)}に反撃${loss}`);
    return true;
  },
  describe: (e) => `攻撃してきた相手に${e.amount}の${e.element ? `${getElement(e.element).name}属性` : ''}ダメージで反撃${e.perTurn !== undefined ? `（${e.team ? '味方みんなで' : ''}1ターン${e.perTurn}回まで）` : ''}`,
  short: (e) => `${e.amount}`,
};
