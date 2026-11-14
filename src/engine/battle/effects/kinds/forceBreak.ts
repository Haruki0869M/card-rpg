// 区切りD-4 決め技の部品: forceBreak: 大技を予告している敵を、すぐに BREAK する（秘剣・天翔龍閃）
import { canBreak, breakEnemy, resolveTargets } from '..';
import { isEnemy } from '../../units';
import { type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    forceBreak: object;
  }
}

export const effect: EffectHandler<'forceBreak'> = {
  kind: 'forceBreak',
  defaultTo: 'target',
  apply(ctx) {
    let any = false;
    for (const t of resolveTargets(ctx, 'target')) if (isEnemy(t) && canBreak(t)) { breakEnemy(ctx, t, 'perfect'); any = true; }
    return any;
  },
  describe: (_e, who) => `${who.replace(/に$/, '')}が大技を予告していれば、すぐに BREAK する`,
};
