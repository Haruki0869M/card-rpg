// フォーカスを使ったカード（フクロウなど）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    usedFocus: {};
  }
}

export const condition: ConditionHandler<'usedFocus'> = {
  kind: 'usedFocus',
  test: (c) => (c.focusUsed ?? 0) > 0,
  describe: () => 'フォーカスを使った時',
};
