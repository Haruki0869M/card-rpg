// 区切りD-4 決め技の部品: missingHpScaled: 自分の減っているHP×mul（最大 max）のダメージ（ブラッド・イクリプス）
import { dealDamage, resolveTargets, targetOf } from '..';
import { type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    missingHpScaled: { mul: number; max: number; element?: string };
  }
}

export const effect: EffectHandler<'missingHpScaled'> = {
  kind: 'missingHpScaled',
  defaultTo: 'target',
  apply(ctx, e) {
    const dmg = Math.min(e.max, Math.floor((ctx.source.maxHp - ctx.source.hp) * e.mul));
    if (dmg <= 0) return false;
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) { dealDamage(ctx, t, dmg, e.element); any = true; }
    return any;
  },
  describe: (e, who) => `${who}自分の減っているHP×${e.mul}の${e.element === 'dark' ? '闇属性' : ''}ダメージ（最大${e.max}）`,
};
