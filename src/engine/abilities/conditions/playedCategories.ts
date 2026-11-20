// このターンに、並べた種類のカードを全部使った（今使ったカードも数える。万華鏡など）
import type { CardCategory } from '../../../types';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    playedCategories: { categories: CardCategory[] };
  }
}

const LABEL: Record<CardCategory, string> = { physical: '物理', magic: '魔法', skill: 'スキル' };

export const condition: ConditionHandler<'playedCategories'> = {
  kind: 'playedCategories',
  test: (c, cond) => {
    const by = (c.self as { playedBy?: Partial<Record<CardCategory, number>> }).playedBy ?? {};
    return cond.categories.every((cat) => (by[cat] ?? 0) > 0 || c.card?.category === cat);
  },
  describe: (cond) => `同じターンに${cond.categories.map((x) => LABEL[x]).join('・')}のカードを全部使った時`,
};
