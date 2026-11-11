// 自分のお供が1回行動する（夢つかみ）。お供の発動型の能力を1つ、きっかけを待たずに発動する
import { petActOnce } from '../../../abilities';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    petAct: object;
  }
}

export const effect: EffectHandler<'petAct'> = {
  kind: 'petAct',
  defaultTo: 'self',
  apply(ctx) {
    const res = petActOnce(ctx.state, ctx.rng, ctx.events, ctx.source, ctx.depth + 1);
    if (!res) return false;
    ctx.parts.push(`お供が行動: ${res}`);
    return true;
  },
  describe: () => 'お供が1回行動する',
};
