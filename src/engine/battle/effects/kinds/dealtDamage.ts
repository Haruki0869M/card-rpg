// 段階7a: 受け取った量（ctx.dealt。あふれた回復量など）と同じダメージを与える（福音の大錫杖《福音の雷》）。
// bossCap = ボス・中ボスとの戦闘では、1回この値まで
import { dealDamage, resolveTargets, targetOf } from '..';
import { getElement } from '../../../../data/elements';
import { nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** cap = どの戦闘でも1回この値まで（段階7b: 強欲王の黄金冠） */
    dealtDamage: { element?: string; bossCap?: number; cap?: number };
  }
}

export const effect: EffectHandler<'dealtDamage'> = {
  kind: 'dealtDamage',
  defaultTo: 'randomFoe',
  apply(ctx, e) {
    if (ctx.dealt <= 0) return false;
    const boss = !!ctx.state.boss || !!ctx.state.midboss;
    const capped = e.cap !== undefined ? Math.min(e.cap, ctx.dealt) : ctx.dealt;
    const amount = boss && e.bossCap !== undefined ? Math.min(e.bossCap, capped) : capped;
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const loss = dealDamage(ctx, t, amount, e.element, 1, boss && e.bossCap !== undefined ? e.bossCap : undefined);
      ctx.parts.push(`${nameOf(t)}に${loss}`);
      any = true;
    }
    return any;
  },
  describe: (e, who) => `${who}${e.cap !== undefined ? '得た量' : 'あふれた量'}と同じ${e.element ? `${getElement(e.element).name}属性の` : ''}ダメージ${e.cap !== undefined ? `（1回${e.cap}まで）` : ''}${e.bossCap !== undefined ? `（ボス・中ボスへは1回${e.bossCap}まで）` : ''}`,
};
