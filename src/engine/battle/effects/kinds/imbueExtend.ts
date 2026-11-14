// 二重付与（魔剣士）: 今宿している属性を、次の物理攻撃カード cards 枚に宿す（ふつうは1枚で消える）
import { getElement } from '../../../../data/elements';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    imbueExtend: { cards: number };
  }
}

export const effect: EffectHandler<'imbueExtend'> = {
  kind: 'imbueExtend',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u) || !u.imbuedElement) { ctx.parts.push('宿している属性が無い'); return false; }
    u.imbueCards = Math.max(u.imbueCards ?? 1, e.cards);
    ctx.parts.push(`${getElement(u.imbuedElement).name}を次の物理カード${e.cards}枚に`);
    return true;
  },
  describe: (e) => `今宿している属性を、次の物理攻撃カード${e.cards}枚に宿す（属性を宿していない時は何も起きない）`,
};
