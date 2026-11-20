// 今のカードが、敵の弱点の属性でダメージを与えた（カードを使った後のきっかけ）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ConditionParams {
    weakHit: {};
  }
}

export const condition: ConditionHandler<'weakHit'> = {
  kind: 'weakHit',
  test: (c) => !!c.weakHit,
  describe: () => '弱点を突いた時',
};
