// 光の蓄え（区切りD）: このターン、聖属性の攻撃をしても「聖光」が消えない
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    holdLight: object;
  }
}

export const effect: EffectHandler<'holdLight'> = {
  kind: 'holdLight',
  defaultTo: 'self',
  apply(ctx) {
    if (isEnemy(ctx.source)) return false;
    ctx.source.holdLight = ctx.state.turn;
    ctx.parts.push('光を蓄えた');
    return true;
  },
  describe: () => 'このターン、聖属性の攻撃をしても「聖光」が消えない',
};
