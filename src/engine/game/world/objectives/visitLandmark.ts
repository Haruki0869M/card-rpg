// 名所を調べる
import { EVENTS } from '../../../../data/events';
import type { ObjectiveHandler } from './types';

declare module '../../../../types' {
  interface ObjectiveParams {
    visitLandmark: { landmarkId: string };
  }
}

export const objective: ObjectiveHandler<'visitLandmark'> = {
  kind: 'visitLandmark',
  goal: () => 1,
  progress: (o, s) => (s.kind === 'visitLandmark' && s.landmarkId === o.landmarkId ? 1 : 0),
  describe: (o) => `「${EVENTS.tryGet(o.landmarkId)?.title ?? o.landmarkId}」を調べる`,
  target: (o) => o.landmarkId,
};
