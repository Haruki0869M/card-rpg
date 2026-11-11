// 「×N回」の攻撃が、全部HPに当たった時（ブロックで止められた回が無い。カードを使った後のきっかけで使う）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    allHitsLanded: { min: number };
  }
}

export const condition: ConditionHandler<'allHitsLanded'> = {
  kind: 'allHitsLanded',
  test: (c, e) => !!c.multi && c.multi.total >= e.min && c.multi.landed === c.multi.total,
  describe: () => '「×N回」の攻撃が全部HPに当たった時',
};
