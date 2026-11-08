// 使ったカードの枠の数が min 以上 max 以下（1枠の一撃か、多枠の連撃か）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    cardSlots: { min?: number; max?: number };
  }
}

export const condition: ConditionHandler<'cardSlots'> = {
  kind: 'cardSlots',
  test: (c, cond) => !!c.card && c.card.slots >= (cond.min ?? 0) && c.card.slots <= (cond.max ?? Infinity),
  describe: (cond) => (cond.max === 1 ? '1枠のカード' : cond.max === undefined ? `${cond.min}枠以上のカード` : `${cond.min ?? 1}〜${cond.max}枠のカード`),
};
