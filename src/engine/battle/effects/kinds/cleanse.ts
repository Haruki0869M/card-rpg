// 悪い状態異常をすべて治す
import { resolveTargets, targetOf } from '..';
import { cleanse, hasHarmful } from '../../statuses';
import { nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface EffectParams {
    /** optional = 治す物が無くても使える（ほかの効果と一緒の道具。全体治癒の香炉） */
    cleanse: { optional?: boolean };
  }
}

export const effect: EffectHandler<'cleanse'> = {
  kind: 'cleanse',
  defaultTo: 'target',
  apply(ctx, e) {
    const ts = resolveTargets(ctx, targetOf(e)).filter((t) => hasHarmful(t.statuses));
    for (const t of ts) cleanse(t.statuses);
    if (ts.length) ctx.parts.push(ts.length > 1 ? '全員の状態異常が治った' : `${nameOf(ts[0])}の状態異常が治った`);
    return ts.length > 0;
  },
  check: (ctx, e) => (e.optional || resolveTargets(ctx, targetOf(e)).some((t) => hasHarmful(t.statuses)) ? null : '治す状態異常がありません'),
  describe: (_e, who) => `${who === '自分に' ? '' : who.replace(/に$/, 'の')}悪い状態異常をすべて治す`,
};
