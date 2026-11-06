// ダンジョンを制覇する
import { DUNGEONS } from '../../../../data/dungeons';
import type { ObjectiveHandler } from './types';

declare module '../../../../types' {
  interface ObjectiveParams {
    clearDungeon: { dungeonId: string };
  }
}

export const objective: ObjectiveHandler<'clearDungeon'> = {
  kind: 'clearDungeon',
  goal: () => 1,
  progress: (o, s) => (s.kind === 'clearDungeon' && s.dungeonId === o.dungeonId ? 1 : 0),
  describe: (o) => `「${DUNGEONS.tryGet(o.dungeonId)?.name ?? o.dungeonId}」を制覇する`,
  target: (o) => o.dungeonId,
};
