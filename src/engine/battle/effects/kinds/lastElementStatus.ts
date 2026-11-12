// 区切りF: 竜脈術師《竜脈》(3)。自分が最後に使った属性の状態異常を、対象に amount 付ける（幻獣の攻撃に乗る）
import { getElement } from '../../../../data/elements';
import { getStatus } from '../../../../data/statuses';
import { addStatus } from '../../statuses';
import { isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    lastElementStatus: { amount: number };
  }
}

export const effect: EffectHandler<'lastElementStatus'> = {
  kind: 'lastElementStatus',
  defaultTo: 'target',
  apply(ctx, e) {
    const t = ctx.target;
    if (!t || !isEnemy(t) || t.dead || isEnemy(ctx.source)) return false;
    const key = Object.keys(ctx.source.counters ?? {}).find((k) => k.startsWith('elLast:'));
    const st = key ? getElement(key.slice(7)).status : undefined;
    if (!st) return false;
    addStatus(t.statuses, st, e.amount);
    ctx.events.push({ type: 'status', unitId: unitIdOf(t), status: st, amount: e.amount });
    ctx.parts.push(`竜脈の${getStatus(st).name}${e.amount}`);
    return true;
  },
  describe: (e) => `自分が最後に使った属性の状態異常を${e.amount}付ける`,
};
