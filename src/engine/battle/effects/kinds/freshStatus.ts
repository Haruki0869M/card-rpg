// 区切りF: 地脈の楔（竜脈術師）。対象にまだ付いていない種類の状態異常を、order の順に count 種類（それぞれ amount）付ける
import { applyEffect, resolveTargets, targetOf } from '..';
import { getStatus } from '../../../../data/statuses';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    freshStatus: { order: string[]; amount: number; count: number };
  }
}

export const effect: EffectHandler<'freshStatus'> = {
  kind: 'freshStatus',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const ids = e.order.filter((id) => !(t.statuses[id as keyof typeof t.statuses] ?? 0)).slice(0, e.count);
      for (const id of ids) any = applyEffect({ ...ctx, target: t }, { kind: 'applyStatus', status: id, amount: e.amount, to: 'target' }) || any;
    }
    return any;
  },
  describe: (e, who) => `${who}まだ付いていない種類の状態異常を${e.count}つ（${e.order.map((x) => `「${getStatus(x).name}」`).join('→')}の順）、${e.amount}ずつ付ける`,
};
