// 区切りD-5: 星読み（スロットの先読み）を1回分取り戻す（星明かりの恵み《星の巡り》）
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    refundPreview: object;
  }
}

export const effect: EffectHandler<'refundPreview'> = {
  kind: 'refundPreview',
  defaultTo: 'self',
  apply(ctx) {
    const u = ctx.source;
    if (isEnemy(u) || !(u.slotPreviewUsed ?? 0)) return false;
    u.slotPreviewUsed = (u.slotPreviewUsed ?? 0) - 1;
    ctx.parts.push('星読みを1回分取り戻した');
    return true;
  },
  describe: () => '星読み（スロットの先読み）を1回分取り戻す',
};
