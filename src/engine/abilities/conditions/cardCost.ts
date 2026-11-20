// 使ったカードのコストが min 以上 max 以下（重いカード・軽いカードで働く装備用）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    cardCost: { min?: number; max?: number };
  }
}

export const condition: ConditionHandler<'cardCost'> = {
  kind: 'cardCost',
  test: (c, cond) => !!c.card && c.card.cost >= (cond.min ?? 0) && c.card.cost <= (cond.max ?? Infinity),
  describe: (cond) => (cond.max === undefined ? `コスト${cond.min}以上のカード` : cond.min === undefined || cond.min === 0 ? `コスト${cond.max}以下のカード` : `コスト${cond.min}〜${cond.max}のカード`),
};
