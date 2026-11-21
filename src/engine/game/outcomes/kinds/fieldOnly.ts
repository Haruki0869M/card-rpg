// 区切りE: 戦闘の外で使う道具の冒険の側（浄化の聖結晶・お供の特上ごちそう）。
// テントの設営具・カード鍛錬の砥石は、手番やカードを選ぶので usePouchItem（engine/game/game.ts）で扱う
import { addLog } from '../../common';
import { heroFocusMax } from '../../hero';
import { lastTurnOfDay } from '../../world/time';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    fieldOnly: { what: 'purify' | 'tent' | 'whetstone' | 'petFeast' | 'elixir' | 'firewood'; amount?: number; focus?: number };
  }
}

export const outcome: OutcomeHandler<'fieldOnly'> = {
  kind: 'fieldOnly',
  apply(ctx, o) {
    if (o.what === 'purify') {
      const w = ctx.game.world;
      if (w) w.corruption = Math.max(0, w.corruption - (o.amount ?? 0));
      for (const h of ctx.targets(true)) h.focus = Math.min(heroFocusMax(h), h.focus + (o.focus ?? 0));
    } else if (o.what === 'petFeast') {
      for (const h of ctx.targets()) h.petFeast = Math.max(h.petFeast ?? 0, o.amount ?? 0);
    } else if (o.what === 'firewood') {
      // 薪の束（シナリオ2の地図のイベント）: 使った相手1人が、次の朝まで寒さを受けない（温泉と同じ印 WorldState.warm）
      const w = ctx.game.world;
      if (!w) return;
      const warm = (w.warm ??= {});
      for (const h of ctx.targets()) {
        warm[h.id] = Math.max(warm[h.id] ?? 0, lastTurnOfDay(w.worldTurn));
        addLog(ctx.game, `${h.name}は薪の火で温まった（次の朝まで寒さを受けない）`);
      }
    }
  },
  check: (ctx, o) => {
    if ((o.what === 'purify' || o.what === 'firewood') && !ctx.game.world) return '世界マップのある冒険で使います';
    if (o.what === 'firewood' && ctx.game.mode !== 'world') return '世界マップで使います';
    if (o.what === 'petFeast' && !ctx.targets().some((h) => h.pet)) return 'お供がいません';
    if (o.what === 'tent' || o.what === 'whetstone' || o.what === 'elixir') return 'この道具は、道具袋から使ってください';
    return null;
  },
  describe: (o) => (o.what === 'firewood' ? '使った相手1人が、次の朝まで寒さを受けない' : o.what === 'purify' ? `侵食度-${o.amount}%・味方全員のフォーカス+${o.focus}` : o.what === 'petFeast' ? `次の戦闘の1ターン目に、お供が${o.amount}回行動する` : ''),
};
