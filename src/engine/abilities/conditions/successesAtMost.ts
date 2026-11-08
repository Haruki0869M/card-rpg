import type { ConditionHandler } from './types';
declare module '../../../types' { interface ConditionParams { successesAtMost: { count: number } } }
export const condition: ConditionHandler<'successesAtMost'> = {
  kind: 'successesAtMost', test: (c, e) => c.successes !== undefined && c.successes <= e.count,
  describe: e => `スロットの成功数が${e.count}以下`,
};
