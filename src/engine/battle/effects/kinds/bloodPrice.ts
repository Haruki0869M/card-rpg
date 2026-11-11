// 血の代価（区切りD）: 前の敵の番からこれまでに自分が失ったHP（払った分も、殴られた分も）と同じ値を、次の攻撃カードの最初の1回に足す（最大 max）
// blockPct = その値の何%をブロックにもするか
import { BALANCE } from '../../../../data/balance';
import { isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    bloodPrice: { max: number; blockPct?: number };
  }
}

export const effect: EffectHandler<'bloodPrice'> = {
  kind: 'bloodPrice',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u)) return false;
    const cs = (u.counters ??= {});
    const n = Math.min(e.max, cs.hpLostTurn ?? 0);
    cs.bloodAdd = n;
    if (e.blockPct && n > 0) {
      const b = Math.floor((n * e.blockPct) / 100);
      u.block = Math.min(BALANCE.blockMax, u.block + b);
      ctx.events.push({ type: 'block', unitId: unitIdOf(u), amount: b });
    }
    ctx.parts.push(n > 0 ? `血の代価+${n}` : '失ったHPが無い');
    return n > 0;
  },
  describe: (e) => `前の敵の番からこれまでに自分が失ったHP（払った分も、殴られた分も）と同じ値を、次の攻撃カードのダメージに足す（最大+${e.max}）${e.blockPct ? `。その${e.blockPct === 50 ? '半分' : `${e.blockPct}%`}のブロックも得る` : ''}`,
};
