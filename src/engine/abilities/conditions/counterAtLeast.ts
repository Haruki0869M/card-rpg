// 数えている値（counters）が n 以上の間（「受け」「影歩き」など、装備の能力が自分で数える物。label = 説明文に出す言い方）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    counterAtLeast: { key: string; n: number; label?: string };
  }
}

export const condition: ConditionHandler<'counterAtLeast'> = {
  kind: 'counterAtLeast',
  test: (c, e) => ((c.self as { counters?: Record<string, number> }).counters?.[e.key] ?? 0) >= e.n,
  describe: (e) => e.label ?? '',
};
