// ランダムな能力値を永続で上げる
import { STAT_LABEL } from '../../../../data/terms';
import { addLog } from '../../common';
import { STAT_IDS } from '../../hero';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    randomStat: { amount: number };
  }
}

export const outcome: OutcomeHandler<'randomStat'> = {
  kind: 'randomStat',
  apply(ctx, o) {
    const h = ctx.targets()[0];
    if (!h) return;
    const s = STAT_IDS[ctx.rng.int(STAT_IDS.length)];
    h.bonusStats[s] = (h.bonusStats[s] ?? 0) + o.amount;
    addLog(ctx.game, `${h.name}の${STAT_LABEL[s]}が${o.amount}上がった`);
  },
  describe: (o) => `ランダムな能力値+${o.amount}（永続）`,
};
