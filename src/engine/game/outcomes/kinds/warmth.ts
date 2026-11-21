// 温泉で温まる（シナリオ2の作り直し §2-1・§8-2）: 対象のキャラは、入った時から次の朝まで（その日の夜の最後のワールドターンまで）寒さを受けない。
// 保存に残る印は WorldState.warm（キャラID → 効き目の最後のワールドターン）。寒さの処理（world/climate.ts の applyClimate）が見て、切れたら消す。
// 乱数は引かない。世界マップの無い冒険では何もしない
import { addLog } from '../../common';
import { lastTurnOfDay, lastTurnOfTime } from '../../world/time';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    /** all: 場面にいる生存者全員（省略は選んだキャラだけ） */
    /** span: 'time' = 今の時間帯（朝・昼・夕方・夜）の間だけ（省略は次の朝まで）。by: 記録の文の「〜で温まった」の〜（省略は温泉） */
    warmth: { all?: boolean; span?: 'time'; by?: string };
  }
}

export const outcome: OutcomeHandler<'warmth'> = {
  kind: 'warmth',
  apply(ctx, o) {
    const w = ctx.game.world;
    if (!w) return;
    const until = o.span === 'time' ? lastTurnOfTime(w.worldTurn) : lastTurnOfDay(w.worldTurn);
    const warm = (w.warm ??= {});
    const names: string[] = [];
    for (const h of ctx.targets(o.all)) {
      warm[h.id] = Math.max(warm[h.id] ?? 0, until);
      names.push(h.name);
    }
    if (names.length) addLog(ctx.game, `${names.join('・')}は${o.by ?? '温泉'}で温まった（${o.span === 'time' ? '今の時間帯の間' : '次の朝まで'}寒さを受けない）`);
  },
  check: (ctx) => (ctx.game.world ? null : '世界マップのある冒険で使います'),
  describe: (o) => `${o.all ? '全員が' : ''}${o.span === 'time' ? '今の時間帯の間' : '次の朝まで'}寒さを受けない`,
};
