// 盗む: 敵のブロックを奪って、自分のブロックにする（盗賊の道。spec §6.4）
import { resolveTargets, targetOf } from '..';
import { isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    steal: { amount: number };
  }
}

export const effect: EffectHandler<'steal'> = {
  kind: 'steal',
  defaultTo: 'target',
  apply(ctx, e) {
    let got = 0;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (!isEnemy(t) || t.block <= 0) continue;
      const n = Math.min(e.amount, t.block);
      t.block -= n;
      got += n;
    }
    if (!got) return false;
    ctx.source.block += got;
    ctx.events.push({ type: 'block', unitId: unitIdOf(ctx.source), amount: got });
    ctx.parts.push(`${nameOf(ctx.source)}がブロック${got}を盗んだ`);
    return true;
  },
  describe: (e, who) => `${who.replace(/に$/, '')}のブロックを最大${e.amount}奪う`,
  short: (e) => `盗${e.amount}`,
};
