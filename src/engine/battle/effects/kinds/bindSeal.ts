// 歌の癒し封じ（敵の特殊な行動・セイレーン。2026-11-14 docs/tasks/behavior-variety-plan.md §3-3）:
// この行動をした敵が倒れると、味方全員の癒し封じが消える（units.ts の killEnemy）。癒し封じを付ける効果と一緒に置く。乱数は使わない
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    bindSeal: { unused?: never };
  }
}

export const effect: EffectHandler<'bindSeal'> = {
  kind: 'bindSeal',
  defaultTo: 'self',
  apply(ctx) {
    const { source } = ctx;
    if (!isEnemy(source) || source.dead) return false;
    source.sealBound = true;
    return true;
  },
  describe: () => 'この敵が倒れると、味方全員の癒し封じが消える',
  short: () => '',
};
