// 区切りF: 相棒とのキズナ大暴走。お供の能力を times 回続けて発動する（お供の行動の1ターン4回の上限には数えない）
import { petActOnce } from '../../../abilities';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    petRampage: { times: number };
  }
}

export const effect: EffectHandler<'petRampage'> = {
  kind: 'petRampage',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u) || !u.pet) return false;
    const cs = (u.counters ??= {});
    let n = 0;
    for (let i = 0; i < e.times; i++) {
      const keep = cs.petActsTurn ?? 0;
      cs.petActsTurn = 0;
      if (petActOnce(ctx.state, ctx.rng, ctx.events, u, ctx.depth + 1)) n++;
      cs.petActsTurn = keep;
    }
    if (n) ctx.parts.push(`お供が${n}回行動`);
    return n > 0;
  },
  describe: (e) => `お供の能力を${e.times}回続けて発動する（お供の行動の1ターン4回の上限には数えない）`,
};
