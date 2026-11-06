// フォーカスの最大値
import type { GrowthHandler } from '../types';

export const growth: GrowthHandler = {
  kind: 'focusMax',
  make: () => ({ kind: 'focusMax', amount: 1 }),
  apply(_g, h, o) {
    h.bonusFocusMax += o.amount;
    h.focus += o.amount;
    return undefined;
  },
  title: (o) => `フォーカス最大 +${o.amount}`,
  text: '確定成功をもっと使えるようになる',
  icon: 'star',
};
