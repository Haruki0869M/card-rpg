// 決まった品を渡す（シナリオ2の薪の番小屋の「薪の束」。item は格だけを指定してくじで選ぶので、名前で渡す時はこちら）。乱数は引かない。
// 袋が満杯・1人が持てる数（pouchMax）に達している時は、ほかの品と同じ決まりでお金に換わる（addItem）
import { getItem } from '../../../../data/items';
import { newItem } from '../../loot';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    giveItem: { itemId: string; count?: number };
  }
}

export const outcome: OutcomeHandler<'giveItem'> = {
  kind: 'giveItem',
  apply(ctx, o) {
    for (let k = 0; k < (o.count ?? 1); k++) ctx.loot.push({ kind: 'item', item: newItem(ctx.game, getItem(o.itemId)) });
  },
  describe: (o) => `「${getItem(o.itemId).name}」${(o.count ?? 1) > 1 ? `${o.count}つ` : ''}`,
};
