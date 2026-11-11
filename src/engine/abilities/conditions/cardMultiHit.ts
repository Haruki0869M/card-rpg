// 今のカードが「×N回」の攻撃を持つ
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    cardMultiHit: {};
  }
}

export const condition: ConditionHandler<'cardMultiHit'> = {
  kind: 'cardMultiHit',
  test: (c) => !!c.card?.tiers.some((t) => t.effects.some((e) => e.kind === 'damage' && (e.hits ?? 1) >= 2)),
  describe: () => '×N回の攻撃のカード',
};
