// 手数の極み（区切りD）: このターンに使ったカードの枚数（このカードも入れる）と同じブロック（最大 max）
import { BALANCE } from '../../../../data/balance';
import { unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    blockFromPlayed: { max: number };
  }
}

export const effect: EffectHandler<'blockFromPlayed'> = {
  kind: 'blockFromPlayed',
  defaultTo: 'self',
  apply(ctx, e) {
    const n = Math.min(e.max, ((ctx.source as { played?: number }).played ?? 0) + 1);
    ctx.source.block = Math.min(BALANCE.blockMax, ctx.source.block + n);
    ctx.events.push({ type: 'block', unitId: unitIdOf(ctx.source), amount: n });
    ctx.parts.push(`${n}ブロック`);
    return true;
  },
  describe: (e) => `このターンに使ったカードの枚数（このカードも入れる）と同じブロック（最大${e.max}）`,
};
