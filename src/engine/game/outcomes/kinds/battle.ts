// 戦闘が始まる（イベントを閉じた後。待ち伏せ・黄金のコソ泥・護衛など）
import type { EventBattle } from '../../../../types';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    battle: EventBattle;
  }
}

export const outcome: OutcomeHandler<'battle'> = {
  kind: 'battle',
  apply(ctx, o) {
    const ev = ctx.game.event;
    if (ev) ev.battle = { ...o };
  },
  describe: (o) => `戦闘${o.surprise ? '（先制）' : ''}${o.goldMul && o.goldMul > 1 ? `・お金×${o.goldMul}` : ''}`,
};
