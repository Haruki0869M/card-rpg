// フォーカスが最大でない（味方のみ）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    focusNotFull: {};
  }
}

export const condition: ConditionHandler<'focusNotFull'> = {
  kind: 'focusNotFull',
  test: (c) => 'focusMax' in c.self && c.self.focus < c.self.focusMax,
  describe: () => 'フォーカスが最大でない時',
};
