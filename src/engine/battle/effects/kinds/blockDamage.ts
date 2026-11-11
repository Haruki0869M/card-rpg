// 自分の今のブロックの pct% のダメージ（シールドスラム・鉄壁の進軍。区切りD）。ブロックは減らない
// gain = 先にブロックを得てから計算する。max = 1回のダメージの上限
import { dealDamage, resolveTargets, targetOf } from '..';
import { BALANCE } from '../../../../data/balance';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    blockDamage: { pct: number; max?: number; gain?: number };
  }
}

export const effect: EffectHandler<'blockDamage'> = {
  kind: 'blockDamage',
  defaultTo: 'target',
  apply(ctx, e) {
    const src = ctx.source;
    if (e.gain) src.block = Math.min(BALANCE.blockMax, src.block + e.gain);
    const amount = Math.min(e.max ?? Infinity, Math.floor((src.block * e.pct) / 100));
    if (amount <= 0) { ctx.parts.push('ブロックが無い'); return false; }
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) { dealDamage(ctx, t, amount); any = true; }
    return any;
  },
  describe: (e, who) => `${e.gain ? `ブロック${e.gain}を得てから、` : ''}${who}自分の今のブロックの${e.pct}%のダメージ${e.max ? `（最大${e.max}）` : ''}`,
  short: (e) => `盾${e.pct}%`,
};
