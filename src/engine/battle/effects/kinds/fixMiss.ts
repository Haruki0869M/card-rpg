// 星の導き（占星術師）: 次に使うカードの、失敗した枠を count 個、成功に変える。乱数は使わない（先読み・保存して再開・オンラインでも同じ結果）
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    fixMiss: { count: number };
  }
}

export const effect: EffectHandler<'fixMiss'> = {
  kind: 'fixMiss',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u)) return false;
    u.fixMiss = Math.max(u.fixMiss ?? 0, e.count);
    ctx.parts.push(`次のカードの失敗を${e.count}つ成功に`);
    return true;
  },
  describe: (e) => `次に使うカードの、失敗した枠を${e.count}つ成功に変える`,
};
