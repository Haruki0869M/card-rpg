// 区切りD-4 決め技の部品: abyss: 対象の statuses の合計×per（最大 max）の闇ダメージ。その後、対象の悪い状態異常を全部2倍（死の宣告・アビス）
import { dealDamage, resolveTargets, targetOf } from '..';
import { addStatus } from '../../statuses';
import { getStatus } from '../../../../data/statuses';
import { unitIdOf } from '../../units';
import { type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    abyss: { statuses: string[]; per: number; max: number };
  }
}

export const effect: EffectHandler<'abyss'> = {
  kind: 'abyss',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const sum = e.statuses.reduce((n, id) => n + (t.statuses[id as keyof typeof t.statuses] ?? 0), 0);
      const dmg = Math.min(e.max, sum * e.per);
      if (dmg > 0) dealDamage(ctx, t, dmg, 'dark');
      if (t.dead) continue;
      for (const [id, n] of Object.entries(t.statuses)) {
        if (!n || !getStatus(id).harmful) continue;
        addStatus(t.statuses, id, n);
        ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: id, amount: n });
      }
      ctx.parts.push('状態異常が2倍に');
      any = true;
    }
    return any;
  },
  describe: (e, who) => `${who}${e.statuses.map((x) => `「${getStatus(x).name}」`).join('')}の合計×${e.per}の闇属性ダメージ（最大${e.max}）。その後、悪い状態異常を全部2倍にする`,
};
