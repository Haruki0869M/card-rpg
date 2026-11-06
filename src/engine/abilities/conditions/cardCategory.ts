// カードの種類（物理・魔法・スキル）
import type { CardCategory } from '../../../types';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    cardCategory: { category: CardCategory };
  }
}

const NAME: Record<CardCategory, string> = { physical: '物理', magic: '魔法', skill: 'スキル' };

export const condition: ConditionHandler<'cardCategory'> = {
  kind: 'cardCategory',
  test: (c, cond) => c.card?.category === cond.category,
  describe: (cond) => `${NAME[cond.category]}カード`,
};
