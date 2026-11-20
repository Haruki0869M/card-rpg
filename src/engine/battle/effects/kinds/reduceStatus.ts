// 状態異常を amount 減らす（文鳥など）
import { resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    reduceStatus: { statuses: string[]; amount: number };
  }
}

export const effect: EffectHandler<'reduceStatus'> = {
  kind: 'reduceStatus',
  defaultTo: 'self',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e)))
      for (const id of e.statuses) {
        const n = t.statuses[id] ?? 0;
        if (n <= 0) continue;
        t.statuses[id] = Math.max(0, n - e.amount);
        any = true;
      }
    if (any) ctx.parts.push(`${e.statuses.map((x) => getStatus(x).name).join('・')}が和らいだ`);
    return any;
  },
  describe: (e, who) => `${who === '自分に' ? '' : who.replace(/に$/, 'の')}${e.statuses.map((x) => `「${getStatus(x).name}」`).join('')}を${e.amount}減らす`,
};
