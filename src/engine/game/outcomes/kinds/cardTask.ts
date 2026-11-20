// 山札のカードを1枚選んで、強化 / 削除 / 変異（別の系統のレア以上に変わる）させる（イベントの後に選ぶ。CARD_TASK）
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    cardTask: { action: 'upgrade' | 'remove' | 'mutate' };
  }
}

const TEXT = { upgrade: '山札のカード1枚を強化', remove: '山札のカード1枚を削除', mutate: '山札のカード1枚を、別の系統のレア以上のカードに変異' };

export const outcome: OutcomeHandler<'cardTask'> = {
  kind: 'cardTask',
  apply(ctx, o) {
    const h = ctx.targets()[0];
    if (h) h.cardTask = o.action;
  },
  describe: (o) => TEXT[o.action],
};
