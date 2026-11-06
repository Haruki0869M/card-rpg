// 徘徊する敵を○体倒す
import type { ObjectiveHandler } from './types';

declare module '../../../../types' {
  interface ObjectiveParams {
    defeatWanderers: { count: number };
  }
}

export const objective: ObjectiveHandler<'defeatWanderers'> = {
  kind: 'defeatWanderers',
  goal: (o) => o.count,
  progress: (_o, s) => (s.kind === 'defeatWanderer' ? 1 : 0),
  describe: (o) => `徘徊する魔物を${o.count}組倒す`,
};
