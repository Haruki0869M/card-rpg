// 今のカードの属性が、この戦闘で前に使った属性カードと違う（属性の無いカードは数えない）
import { cardElements } from '../../battle/cardState';
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    elementChanged: {};
  }
}

export const condition: ConditionHandler<'elementChanged'> = {
  kind: 'elementChanged',
  test: (c) => {
    const els = cardElements(c.card);
    if (!els.length) return false;
    const last = Object.entries((c.self as { counters?: Record<string, number> }).counters ?? {}).filter(([k, v]) => k.startsWith('elLast:') && v > 0).map(([k]) => k.slice(7));
    return last.length > 0 && els.some((el) => !last.includes(el));
  },
  describe: () => '前に使ったカードと違う属性のカード',
};
