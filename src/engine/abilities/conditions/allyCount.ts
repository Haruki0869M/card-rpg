// 生きている味方の人数（1人旅の時の決まり）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    allyCount: { max: number };
  }
}

export const condition: ConditionHandler<'allyCount'> = {
  kind: 'allyCount',
  test: (c, e) => !!c.state && c.state.allies.filter((a) => !a.dead).length <= e.max,
  describe: (e) => (e.max === 1 ? '味方が自分だけの時' : '味方が' + e.max + '人以下の時'),
};
