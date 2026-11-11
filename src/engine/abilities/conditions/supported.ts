// 今のカードで味方への支援が成立した（ほかの味方のHP・ブロック・マナ・フォーカスが増えた、悪い状態異常が減った、良い状態異常が増えた）。1人パーティの時は、自分への支援でも成立
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    supported: {};
  }
}

export const condition: ConditionHandler<'supported'> = {
  kind: 'supported',
  test: (c) => !!c.supportedOthers || (!!c.supportedSelf && c.state?.allies.length === 1),
  describe: () => '味方への支援が成立した時（1人の時は自分への支援でも）',
};
