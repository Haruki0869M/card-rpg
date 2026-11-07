// このターンに使った（category の）カードの枚数 × per のダメージ（子狼の追撃など）
import { dealDamage, resolveTargets, targetOf } from '..';
import type { CardCategory } from '../../../../types';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    damageByPlays: { per: number; category?: CardCategory };
  }
}

const CAT: Record<CardCategory, string> = { physical: '物理', magic: '魔法', skill: '技' };

export const effect: EffectHandler<'damageByPlays'> = {
  kind: 'damageByPlays',
  defaultTo: 'randomFoe',
  apply(ctx, e) {
    const src = ctx.source as { played?: number; playedBy?: Partial<Record<CardCategory, number>> };
    const n = e.category ? (src.playedBy?.[e.category] ?? 0) : (src.played ?? 0);
    if (n <= 0) return false;
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      ctx.parts.push(`${dealDamage(ctx, t, n * e.per)}ダメージ`);
      any = true;
    }
    return any;
  },
  describe: (e, who) => `${who}「このターンに使った${e.category ? CAT[e.category] : ''}カードの数×${e.per}」のダメージ`,
};
