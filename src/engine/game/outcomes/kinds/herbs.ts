// 薬草を摘む（段階6a の薬草の群生地）: 決めた消耗品の中から、count の範囲の数だけ Rng で選んで手に入れる
import { ITEMS } from '../../../../data/items';
import { newItem } from '../../loot';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    /** itemIds: 選ぶ候補（同じ物を並べると出やすくなる）。count: 手に入れる数の範囲 */
    herbs: { itemIds: string[]; count: [number, number] };
  }
}

export const outcome: OutcomeHandler<'herbs'> = {
  kind: 'herbs',
  apply(ctx, o) {
    const [lo, hi] = o.count;
    const n = lo + ctx.rng.int(hi - lo + 1);
    for (let k = 0; k < n; k++) {
      const def = ITEMS.get(o.itemIds[ctx.rng.int(o.itemIds.length)]);
      ctx.loot.push({ kind: 'item', item: newItem(ctx.game, def) });
    }
  },
  describe: (o) => `回復の消耗品${o.count[0]}〜${o.count[1]}個`,
};
