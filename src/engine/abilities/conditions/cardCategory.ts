// カードの種類（物理・魔法・スキル）
import { CATEGORY_LABEL } from '../../../data/terms';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    cardCategory: { category: CardCategory };
  }
}


export const condition: ConditionHandler<'cardCategory'> = {
  kind: 'cardCategory',
  test: (c, cond) => c.card?.category === cond.category,
  describe: (cond) => `${CATEGORY_LABEL[cond.category]}カード`,
};
