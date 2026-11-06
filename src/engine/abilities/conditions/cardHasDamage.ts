// ダメージを与えるカード
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    cardHasDamage: {};
  }
}

export const condition: ConditionHandler<'cardHasDamage'> = {
  kind: 'cardHasDamage',
  test: (c) => !!c.card?.tiers.some((t) => t.effects.some((e) => e.kind === 'damage')),
  describe: () => 'ダメージを与えるカード',
};
