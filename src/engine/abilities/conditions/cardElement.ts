// 属性の攻撃のカード（element を書けばその属性だけ）
import type { ConditionHandler } from './types';
import { getElement } from '../../../data/elements';

declare module '../../../types' {
  interface ConditionParams {
    cardElement: { element?: string };
  }
}

export const condition: ConditionHandler<'cardElement'> = {
  kind: 'cardElement',
  test: (c, cond) =>
    !!c.card?.tiers.some((t) => t.effects.some((e) => e.kind === 'damage' && !!e.element && (!cond.element || e.element === cond.element))),
  describe: (cond) => (cond.element ? `${getElement(cond.element).name}属性の攻撃` : '属性の攻撃'),
};
