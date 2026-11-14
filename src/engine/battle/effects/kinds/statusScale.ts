// 対象の状態異常を増やす（区切りD: 爆炎触媒）。mul = 何倍か・add = 足す数（すでに付いている敵だけ。onlyIf を false にすると付いていない敵にも足す）・maxAdd = 1体の増える上限
import { resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    statusScale: { status: string; mul?: number; add?: number; maxAdd?: number; onlyIf?: boolean };
  }
}

export const effect: EffectHandler<'statusScale'> = {
  kind: 'statusScale',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const n = t.statuses[e.status] ?? 0;
      if (n <= 0 && e.onlyIf !== false) continue;
      const inc = Math.min(e.maxAdd ?? Infinity, n * ((e.mul ?? 1) - 1) + (e.add ?? 0));
      if (inc <= 0) continue;
      addStatus(t.statuses, e.status, inc);
      ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: e.status, amount: inc });
      any = true;
    }
    if (any) ctx.parts.push(`${getStatus(e.status).name}が増えた`);
    return any;
  },
  describe: (e, who) => `${who.replace(/に$/, 'の')}「${getStatus(e.status).name}」を${e.mul ? `${e.mul}倍に` : `+${e.add}`}${e.maxAdd ? `（1体につき増えるのは最大+${e.maxAdd}）` : ''}${e.onlyIf === false ? '' : '（付いている敵だけ）'}`,
};
