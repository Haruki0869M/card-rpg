// 今のカードの属性が、対象の弱点（対象が無いカード・全体カードは、生きている敵の誰かの弱点）
import { getEnemy } from '../../../data/enemies';
import { cardElements } from '../../battle/cardState';
import { isEnemy } from '../../battle/units';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    cardWeakness: {};
  }
}

export const condition: ConditionHandler<'cardWeakness'> = {
  kind: 'cardWeakness',
  test: (c) => {
    const els = cardElements(c.card);
    if (!els.length) return false;
    const foes = c.card?.target !== 'allEnemies' && c.target ? [c.target] : (c.state?.enemies ?? []).filter((e) => !e.dead);
    return foes.some((f) => isEnemy(f) && els.some((el) => getEnemy(f.defId).weak?.includes(el)));
  },
  describe: () => '弱点を突くカード',
};
