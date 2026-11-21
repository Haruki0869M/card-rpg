// 世界マップの残りの移動力を増やす / 減らす
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    /** stop: このターンはもう動けない（amount は見ない）。label: 振る前に増えた時に、サイコロの内訳に出す名前 */
    move: { amount: number; stop?: boolean; label?: string };
  }
}

export const outcome: OutcomeHandler<'move'> = {
  kind: 'move',
  apply(ctx, o) {
    const w = ctx.game.world;
    if (!w) return;
    // サイコロを振る前（マスのイベントは、振る前にも調べられる）: 止まる = このターンの移動力を0で確定／増える = 次のサイコロに足す。
    // 減る（突発イベントは振った後にしか起きない）は、今までどおり何もしない
    if (w.move === null) {
      if (o.stop) {
        w.move = 0;
        w.prevTile = w.pos[w.turn];
      } else if (o.amount > 0) w.moveBonus = { value: (w.moveBonus?.value ?? 0) + o.amount, label: o.label ?? 'イベント' };
      return;
    }
    w.move = o.stop ? 0 : Math.max(0, w.move + o.amount);
  },
  describe: (o) => (o.stop ? 'このターンはもう動けない' : `残りの移動力${o.amount >= 0 ? '+' : ''}${o.amount}`),
};
