// 自分の悪い状態異常を全部消し、消した種類の数 × per のダメージ（区切りD: 呪詛返しの契り）
import { dealDamage, resolveTargets, targetOf } from '..';
import { getElement } from '../../../../data/elements';
import { getStatus } from '../../../../data/statuses';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    cleanseBurst: { per: number; element?: string };
  }
}

export const effect: EffectHandler<'cleanseBurst'> = {
  kind: 'cleanseBurst',
  defaultTo: 'target',
  apply(ctx, e) {
    const s = ctx.source.statuses;
    let kinds = 0;
    for (const [id, n] of Object.entries(s)) if ((n ?? 0) > 0 && getStatus(id).harmful) { s[id as keyof typeof s] = 0; kinds += 1; }
    if (kinds <= 0) return false;
    ctx.parts.push(`呪詛返し（${kinds}種類）`);
    for (const t of resolveTargets(ctx, targetOf(e))) dealDamage(ctx, t, kinds * e.per, e.element);
    return true;
  },
  describe: (e, who) => `自分の悪い状態異常を全部消し、${who}消した種類の数×${e.per}の${e.element ? `${getElement(e.element).name}属性` : ''}ダメージ`,
};
