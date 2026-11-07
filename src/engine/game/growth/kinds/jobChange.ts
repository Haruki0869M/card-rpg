// 転職（レベルアップの時に、転職できるジョブがあれば候補に出る。spec §6.4）
import { getClass } from '../../../../data/classes';
import { changeJob } from '../../jobs';
import type { GrowthHandler } from '../types';

export const growth: GrowthHandler = {
  kind: 'jobChange',
  // 候補は growthOptions が転職できるジョブごとに作る
  make: () => ({ kind: 'jobChange', amount: 0 }),
  apply(game, h, o) {
    if (!o.jobId) return '転職先がありません';
    return changeJob(game, h, o.jobId);
  },
  title: (o) => `転職：${o.jobId ? getClass(o.jobId).name : ''}`,
  text: 'Lv1に戻るが、ジョブの段が上がって強くなる。今の戦闘の特殊能力を持ち越す',
  icon: 'arrowUp',
};
