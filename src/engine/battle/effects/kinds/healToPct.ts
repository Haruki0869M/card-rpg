// 巻き戻し（2026-11-14 ボスの段階・docs/tasks/boss-phase-plan.md 柱2）: HPを、最大HPの pct% まで戻す（もう上なら何も起きない）。
// ボスの段階の開幕の一手（脱皮・逆回し）が使う。ふつうの回復と同じく、呪い・癒し封じで量が減る。乱数は使わない
import { resolveTargets, targetOf } from '..';
import { healUnit, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    healToPct: { pct: number };
  }
}

export const effect: EffectHandler<'healToPct'> = {
  kind: 'healToPct',
  defaultTo: 'self',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const want = Math.floor((t.maxHp * e.pct) / 100) - t.hp;
      if (want <= 0) continue;
      const healed = healUnit(t, want, ctx.events);
      if (healed <= 0) continue;
      any = true;
      ctx.parts.push(`${nameOf(t)}のHPが${e.pct}%まで戻った（+${healed}）`);
    }
    return any;
  },
  describe: (e, who) => `${who === '自分に' ? '自分の' : who.replace(/に$/, 'の')}HPを最大の${e.pct}%まで戻す（もう上なら何も起きない。呪い・癒し封じで減る）`,
  short: (e) => `${e.pct}%`,
};
