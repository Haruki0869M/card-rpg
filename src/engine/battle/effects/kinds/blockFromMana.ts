// 魔力の結界（宿題3・2026-11-14）: 使わずに残ったマナ1につき per のブロック（最大 max）。そのマナは使い切る
// （過充填の魔導炉の持ち越しと二重に得をしないため）。ターンの終わりのきっかけ（turnEnd）で使う
import { BALANCE } from '../../../../data/balance';
import { isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    blockFromMana: { per: number; max: number };
  }
}

export const effect: EffectHandler<'blockFromMana'> = {
  kind: 'blockFromMana',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u) || u.dead) return false;
    const left = Math.max(0, u.mana);
    const n = Math.min(e.max, left * e.per);
    if (n <= 0) { ctx.parts.push('残ったマナが無い'); return false; }
    u.mana = 0;
    u.block = Math.min(BALANCE.blockMax, u.block + n);
    ctx.events.push({ type: 'block', unitId: unitIdOf(u), amount: n });
    ctx.parts.push(`残ったマナ${left}を結界に・${n}ブロック`);
    return true;
  },
  describe: (e) => `使わずに残ったマナ1につきブロック${e.per}（最大${e.max}。そのマナは使い切る）`,
  short: (e) => `マナ×${e.per}`,
};
