// 能力値（どの能力値かは職業の伸びやすさで選ぶ）
import { BALANCE } from '../../../../data/balance';
import type { StatId } from '../../../../types';
import type { GrowthHandler } from '../types';

const STAT_LABEL: Record<StatId, string> = { str: '力', vit: '体力', int: '知力', per: '感知', dex: '器用', agi: '素早さ', luk: '運' };

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
