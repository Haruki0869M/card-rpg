// 区切りD-5: 自分の召喚（砲台・幻獣など）の残りターン+turns（戦闘の間ずっといる物は変わらない）。only = 召喚の id の頭（例: turret）
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    extendSummons: { turns: number; only?: string[]; label?: string };
  }
}

export const effect: EffectHandler<'extendSummons'> = {
  kind: 'extendSummons',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u)) return false;
    let any = false;
    for (const s of u.summons ?? []) {
      if (s.turns >= 99 || (e.only && !e.only.some((id) => s.id.startsWith(id)))) continue;
      s.turns += e.turns;
      any = true;
    }
    if (any) ctx.parts.push(`${e.label ?? '召喚'}の残りターン+${e.turns}`);
    return any;
  },
  describe: (e) => `自分の${e.label ?? '召喚（砲台・幻獣など）'}の残りターン+${e.turns}`,
};
