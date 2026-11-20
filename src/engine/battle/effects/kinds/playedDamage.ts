import { dealDamage } from '..';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { playedDamage: { per: number } } }
export const effect: EffectHandler<'playedDamage'> = {
  kind: 'playedDamage', defaultTo: 'target',
  apply(ctx, e) {
    if (isEnemy(ctx.source)) return false;
    const source = ctx.source;
    const t = ctx.state.enemies.find(x => x.uid === source.lastTargetId && !x.dead) ?? ctx.state.enemies.find(x => !x.dead);
    if (!t || !ctx.source.played) return false;
    dealDamage(ctx, t, ctx.source.played * e.per);
    return true;
  },
  describe: (e) => `このターンに使ったカードの枚数×${e.per}ダメージ（最後に攻撃した敵へ）`,
};
