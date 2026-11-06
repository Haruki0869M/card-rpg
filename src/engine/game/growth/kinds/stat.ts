// 能力値（どの能力値かは職業の伸びやすさで選ぶ）
import { BALANCE } from '../../../../data/balance';
import { STAT_LABEL } from '../../../../data/terms';
import type { GrowthHandler } from '../types';


export const growth: GrowthHandler = {
  kind: 'stat',
  make: () => ({ kind: 'stat', stat: 'str', amount: BALANCE.growthStat }),
  apply(_g, h, o) {
    h.bonusStats[o.stat!] = (h.bonusStats[o.stat!] ?? 0) + o.amount;
    return undefined;
  },
  title: (o) => `${STAT_LABEL[o.stat!]} +${o.amount}`,
  text: '能力値が上がり、関係する成功率も上がる',
  icon: 'trendingUp',
};
