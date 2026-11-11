// このターンに、その種類のカードを使った枚数（今のカードは数えない。カードの効果の途中・使った後のきっかけでは「今のカードより前の枚数」）
import { CATEGORY_LABEL } from '../../../data/terms';
import type { CardCategory } from '../../../types';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    playedCategoryCount: { category: CardCategory; min?: number; max?: number };
  }
}

export const condition: ConditionHandler<'playedCategoryCount'> = {
  kind: 'playedCategoryCount',
  test: (c, e) => {
    const n = (c.self as { playedBy?: Partial<Record<CardCategory, number>> }).playedBy?.[e.category] ?? 0;
    return n >= (e.min ?? 0) && n <= (e.max ?? Infinity);
  },
  describe: (e) => (e.max === 0 ? 'そのターン最初の' + CATEGORY_LABEL[e.category] + 'カード' : e.min !== undefined && e.max === undefined ? 'そのターンの' + (e.min + 1) + '枚目からの' + CATEGORY_LABEL[e.category] + 'カード' : 'そのターンに使った' + CATEGORY_LABEL[e.category] + 'カードが' + (e.min ?? 0) + (e.max !== undefined && e.max !== e.min ? '〜' + e.max : '') + '枚の時'),
};
