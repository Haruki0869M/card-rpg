// 聖光を得る（区切りD: 僧侶の系統にも開く）。上限は 聖騎士・聖王 = BALANCE.holyLightMaxPaladin、ほか = BALANCE.holyLightMaxOthers
import { BALANCE } from '../../../../data/balance';
import { isEnemy, unitIdOf, type Unit } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    holyGain: { amount: number };
  }
}

/** その味方の聖光の上限 */
export const holyLightMax = (u: Unit) => !isEnemy(u) && ['paladin', 'holyKing'].includes(u.classId) ? BALANCE.holyLightMaxPaladin : BALANCE.holyLightMaxOthers;

/** 聖光を n 足す（上限まで）。増えた数を返す */
export function addHolyLight(u: Unit, n: number, events: { type: string }[]): number {
  const cur = u.statuses.holyLight ?? 0;
  const next = Math.min(holyLightMax(u), cur + n);
  if (next <= cur) return 0;
  u.statuses.holyLight = next;
  (events as never[]).push({ type: 'status', unitId: unitIdOf(u), status: 'holyLight', amount: next - cur } as never);
  return next - cur;
}

export const effect: EffectHandler<'holyGain'> = {
  kind: 'holyGain',
  defaultTo: 'self',
  apply(ctx, e) {
    const got = addHolyLight(ctx.source, e.amount, ctx.events);
    if (got > 0) ctx.parts.push(`聖光+${got}`);
    return got > 0;
  },
  describe: (e) => `自分に「聖光」+${e.amount}（聖騎士・聖王は最大${BALANCE.holyLightMaxPaladin}、ほかは最大${BALANCE.holyLightMaxOthers}）`,
};
