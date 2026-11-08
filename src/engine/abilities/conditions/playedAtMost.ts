import type { ConditionHandler } from './types';
declare module '../../../types' { interface ConditionParams { playedAtMost: { count: number } } }
export const condition: ConditionHandler<'playedAtMost'> = {
  kind: 'playedAtMost',
  test: (c, e) => ((c.self as { played?: number }).played ?? 0) <= e.count,
  describe: e => e.count === 0 ? 'このターンにカードを使わなかった時' : `このターンに使ったカードが${e.count}枚以下`,
};
