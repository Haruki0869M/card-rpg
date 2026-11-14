// 段階7b: 自分に付いた悪い状態異常（ctx.statusId と、その数 ctx.dealt）を、同じだけ相手全員にも付ける（悪夢の毛皮《悪夢返し》）。
// 「自分に悪い状態異常が付いた時」のきっかけ（statusTaken）からだけ動く。凍結は、ボス・中ボスには代わりに弱体（今の決まりと同じ）。
// 相手の「状態異常を与えた時」のきっかけは起こさない（うつした先でさらに増えて回り続けないように）。乱数は使わない
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { foesOf, isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    mirrorStatus: {};
  }
}

export const effect: EffectHandler<'mirrorStatus'> = {
  kind: 'mirrorStatus',
  defaultTo: 'foes',
  apply(ctx) {
    const id = ctx.statusId;
    const n = ctx.dealt;
    if (!id || n <= 0 || !getStatus(id).harmful) return false;
    const st = id === 'freeze' && (ctx.state.boss || ctx.state.midboss) ? 'weak' : id;
    let any = false;
    for (const t of foesOf(ctx.state, ctx.source)) {
      if (!isEnemy(t)) continue;
      addStatus(t.statuses, st, n);
      ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: st, amount: n });
      any = true;
    }
    if (any) ctx.parts.push(`敵全員に${getStatus(st).name}${n}`);
    return any;
  },
  describe: () => '自分に付いたのと同じ状態異常を、同じ数だけ敵全員にも付ける（凍結は、ボス・中ボスには弱体）',
};
