// 不動の拳（区切りD）: この敵の番に自分が受けた攻撃の合計（防いだ分も入れる）の pct% を、次のターンの最初の物理カードに足す（最大 max）
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    steadfast: { pct: number; max: number };
  }
}

export const effect: EffectHandler<'steadfast'> = {
  kind: 'steadfast',
  defaultTo: 'self',
  apply(ctx, e) {
    const cs = ((ctx.source as { counters?: Record<string, number> }).counters ??= {});
    cs.fudoOn = 1;
    cs.fudoStore = 0;
    cs.fudoPct = e.pct;
    cs.fudoMax = e.max;
    ctx.parts.push('不動の構え');
    return true;
  },
  describe: (e) => `この敵の番に自分が受けた攻撃の合計（防いだ分も入れる）の${e.pct}%を、次のターンの最初の物理カードのダメージに足す（最大+${e.max}）`,
};
