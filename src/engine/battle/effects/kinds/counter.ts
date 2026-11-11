// 自分の数え（counters）を書き換える。装備の能力が「次の〜」を覚えておくための部品（乱数は使わない。保存データに入る）
// silent = 画面に能力の名前を出さない（数えを戻すだけの時）
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    counter: { key: string; set?: number; add?: number; max?: number; silent?: boolean; text?: string };
  }
}

export const effect: EffectHandler<'counter'> = {
  kind: 'counter',
  defaultTo: 'self',
  apply(ctx, e) {
    const cs = ((ctx.source as { counters?: Record<string, number> }).counters ??= {});
    const next = e.set !== undefined ? e.set : (cs[e.key] ?? 0) + (e.add ?? 0);
    cs[e.key] = e.max !== undefined ? Math.min(e.max, next) : next;
    if (e.silent) return false;
    if (e.text) ctx.parts.push(e.text);
    return true;
  },
  describe: (e) => e.text ?? '',
};
