import { resolveTargets, targetOf } from '..';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { skipIntent: { unused?: never } } }
export const effect: EffectHandler<'skipIntent'> = {
  kind: 'skipIntent', defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) if (isEnemy(t) && t.intent) { t.skipNextAction = true; any = true; }
    if (any) ctx.parts.push('次の行動を休みにした');
    return any;
  },
  describe: () => '選んだ敵1体の次の行動を休みにする',
  short: () => '休み',
};
