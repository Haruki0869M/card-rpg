// 最大HP
import { BALANCE } from '../../../../data/balance';
import type { GrowthHandler } from '../types';

export const growth: GrowthHandler = {
  kind: 'maxHp',
  make: () => ({ kind: 'maxHp', amount: BALANCE.growthMaxHp }),
  apply(_g, h, o) {
    h.bonusMaxHp += o.amount;
    h.hp += o.amount;
    return undefined;
  },
  title: (o) => `最大HP +${o.amount}`,
  text: '打たれ強くなる',
  icon: 'heart',
};
