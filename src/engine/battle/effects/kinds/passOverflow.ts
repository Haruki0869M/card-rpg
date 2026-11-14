// 満ち潮の杯（宿題3・宿題7・2026-11-14）: あふれた回復（ctx.dealt。きっかけ overheal）を、HPの割合が一番低い、傷ついたほかの味方に流す（1回 max まで）。
// 傷ついたほかの味方がいない時（1人の時など）は、自分のブロックにする。流した回復はもう一度はあふれない（healUnit を直接使う。きっかけを起こさない）
import { BALANCE } from '../../../../data/balance';
import { healUnit, isEnemy, nameOf, sideOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    passOverflow: { max: number };
  }
}

export const effect: EffectHandler<'passOverflow'> = {
  kind: 'passOverflow',
  defaultTo: 'self',
  apply(ctx, e) {
    const me = ctx.source;
    const n = Math.min(e.max, ctx.dealt);
    if (isEnemy(me) || me.dead || n <= 0) return false;
    const others = sideOf(ctx.state, me).filter((u) => u !== me && u.hp < u.maxHp);
    if (others.length) {
      const t = others.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a));
      const healed = healUnit(t, n, ctx.events);
      ctx.parts.push(`あふれた回復を${nameOf(t)}へ・HP+${healed}`);
      return healed > 0;
    }
    me.block = Math.min(BALANCE.blockMax, me.block + n);
    ctx.events.push({ type: 'block', unitId: unitIdOf(me), amount: n });
    ctx.parts.push(`あふれた回復を${n}ブロックに`);
    return true;
  },
  describe: (e) => `あふれた量（1回${e.max}まで）を、HPの割合が一番低い、傷ついたほかの味方の回復に（いなければ、自分のブロックに）`,
};
