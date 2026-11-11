// 悪い状態異常を1種類だけ治す（一番多く積もっている物。同じ数なら登録の順。乱数は使わない）
import { resolveTargets, targetOf } from '..';
import { STATUSES } from '../../../../data/statuses';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface EffectParams {
    cleanseOne: {};
  }
}

export const effect: EffectHandler<'cleanseOne'> = {
  kind: 'cleanseOne',
  defaultTo: 'target',
  apply(ctx, e) {
    const names = new Set<string>();
    for (const t of resolveTargets(ctx, targetOf(e))) {
      let best: (typeof STATUSES.all)[number] | undefined;
      for (const d of STATUSES.all) if (d.harmful && (t.statuses[d.id] ?? 0) > (best ? t.statuses[best.id] ?? 0 : 0)) best = d;
      if (!best) continue;
      t.statuses[best.id] = 0;
      names.add(best.name);
    }
    if (names.size) ctx.parts.push(`${[...names].join('・')}が治った`);
    return names.size > 0;
  },
  describe: (_e, who) => `${who === '自分に' ? '' : who.replace(/に$/, 'の')}悪い状態異常を1つ治す`,
};
