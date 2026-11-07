// 回復するカード（祈りの器など）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    cardHasHeal: {};
  }
}

export const condition: ConditionHandler<'cardHasHeal'> = {
  kind: 'cardHasHeal',
  test: (c) => !!c.card?.tiers.some((t) => t.effects.some((e) => e.kind === 'heal')),
  describe: () => '回復のカード',
};
