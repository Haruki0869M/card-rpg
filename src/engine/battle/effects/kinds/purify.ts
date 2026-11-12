// 浄化（敵の特殊な行動・沼の大ガマの脱皮）: 自分の悪い状態異常を全部消し、消した1種類につきHPを amount 回復する。
// 何も付いていなければ、何も起きない。乱数は使わない
import { resolveTargets, targetOf } from '..';
import { activeStatuses } from '../../statuses';
import { healUnit, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    purify: { amount: number };
  }
}

export const effect: EffectHandler<'purify'> = {
  kind: 'purify',
  defaultTo: 'self',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const kinds = activeStatuses(t.statuses).filter(({ def }) => def.harmful);
      if (!kinds.length) continue;
      for (const { def } of kinds) t.statuses[def.id] = 0;
      const healed = healUnit(t, e.amount * kinds.length, ctx.events);
      any = true;
      ctx.parts.push(`${nameOf(t)}の状態異常${kinds.length}種類が消えた${healed > 0 ? `・HP+${healed}` : ''}`);
    }
    return any;
  },
  describe: (e, who) => `${who === '自分に' ? '自分の' : who.replace(/に$/, 'の')}悪い状態異常を全部消し、消した1種類につきHP${e.amount}回復（何も付いていなければ何も起きない）`,
  short: (e) => `+${e.amount}`,
};
