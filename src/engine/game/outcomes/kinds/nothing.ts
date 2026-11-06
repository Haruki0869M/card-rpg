// 何も起きない
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface OutcomeParams {
    nothing: {};
  }
}

export const outcome: OutcomeHandler<'nothing'> = {
  kind: 'nothing',
  apply() {},
  describe: () => '何も起きない',
};
