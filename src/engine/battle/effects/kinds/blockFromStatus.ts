// 状態異常の量だけブロックを得る（例: 敵全員の毒の合計 × 1）。K2の装飾品「毒のダメージ分ブロック」用
import { resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import { foesOf, isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** of: 量を数える相手（foes = 敵全員の合計 / self = 自分）。mult 倍のブロック（最大 max） */
    blockFromStatus: { status: string; of?: 'foes' | 'self'; mult?: number; max?: number };
  }
}

export const effect: EffectHandler<'blockFromStatus'> = {
  kind: 'blockFromStatus',
  defaultTo: 'self',
  apply(ctx, e) {
    const holders = e.of === 'self' ? [ctx.source] : foesOf(ctx.state, ctx.source);
    const total = holders.reduce((n, u) => n + (u.statuses[e.status] ?? 0), 0);
    let amount = Math.floor(total * (e.mult ?? 1));
    if (e.max !== undefined) amount = Math.min(amount, e.max);
    if (amount <= 0) return false;
    const ts = resolveTargets(ctx, targetOf(e));
    for (const t of ts) {
      t.block += amount;
      ctx.events.push({ type: 'block', unitId: unitIdOf(t), amount });
    }
    if (!isEnemy(ctx.source)) ctx.parts.push(`${amount} BLOCK`);
    return ts.length > 0;
  },
  describe: (e, who) => `${e.of === 'self' ? '自分の' : '敵全員の'}「${getStatus(e.status).name}」${e.mult && e.mult !== 1 ? `×${e.mult}` : ''}と同じ量のブロックを${who === '自分に' ? '得る' : `${who}与える`}${e.max !== undefined ? `（最大${e.max}）` : ''}`,
  short: (e) => `${e.mult ?? 1}×`,
};
