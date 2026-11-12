// 生きている味方の人数が min 人以上（仲間と一緒の時だけ働く力。段階7a: 追撃の雷鳴刀）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    allyCountAtLeast: { min: number };
  }
}

export const condition: ConditionHandler<'allyCountAtLeast'> = {
  kind: 'allyCountAtLeast',
  test: (c, e) => !!c.state && c.state.allies.filter((a) => !a.dead).length >= e.min,
  describe: (e) => `味方が${e.min}人以上の時`,
};
