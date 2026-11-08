// 話を聞くだけの依頼（受けたらすぐ報告できる。「船を借りる」など、町の人からの贈り物に使う）
import type { ObjectiveHandler } from './types';

declare module '../../../../types' {
  interface ObjectiveParams {
    talk: { text?: string };
  }
}

export const objective: ObjectiveHandler<'talk'> = {
  kind: 'talk',
  goal: () => 1,
  canReport: () => true,
  describe: (o) => o.text ?? '町の人の話を聞く',
};
