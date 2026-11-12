// 手数読み（敵の特殊な行動・葦陰の狩人）: このターンにカードを min 枚以上使った味方それぞれに、（使った枚数 × amount）のダメージ。
// 使った枚数は味方の played（次の味方の番の始めに0に戻る）。ブロックで防げる。BREAK された時は、今の大技の決まりどおり amount が半分になる
import { dealDamage, resolveTargets, targetOf } from '..';
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    punishPlays: { amount: number; min: number };
  }
}

export const effect: EffectHandler<'punishPlays'> = {
  kind: 'punishPlays',
  defaultTo: 'foes',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (isEnemy(t)) continue;
      const played = t.played ?? 0;
      if (played < e.min) continue;
      const loss = dealDamage(ctx, t, played * e.amount);
      any = true;
      ctx.parts.push(`${nameOf(t)}（${played}枚）に${loss}`);
    }
    if (!any) ctx.parts.push(`${e.min}枚以上使った味方はいない`);
    return any;
  },
  describe: (e, who) => `このターンにカードを${e.min}枚以上使った${who === '味方全員に' ? '味方' : '相手'}それぞれに、使った枚数×${e.amount}のダメージ（${e.min - 1}枚以下なら何もしない）`,
  short: (e) => `${e.min}枚+`,
};
