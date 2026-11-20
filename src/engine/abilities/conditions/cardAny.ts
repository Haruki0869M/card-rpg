// カードがどれかに当てはまる（属性のどれか・種類のどれか。シマエナガ: 氷属性か技のカード）
import { getElement } from '../../../data/elements';
import type { CardCategory } from '../../../types';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    cardAny: { elements?: string[]; categories?: CardCategory[] };
  }
}

const CAT: Record<CardCategory, string> = { physical: '物理', magic: '魔法', skill: '技' };

export const condition: ConditionHandler<'cardAny'> = {
  kind: 'cardAny',
  test: (c, cond) => {
    const card = c.card;
    if (!card) return false;
    if (cond.categories?.includes(card.category)) return true;
    return !!cond.elements?.length && card.tiers.some((t) => t.effects.some((e) => e.kind === 'damage' && !!e.element && cond.elements!.includes(e.element)));
  },
  describe: (cond) => [...(cond.elements ?? []).map((e) => `${getElement(e).name}属性`), ...(cond.categories ?? []).map((x) => `${CAT[x]}のカード`)].join('か') + 'で',
};
