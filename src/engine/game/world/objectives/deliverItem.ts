// アイテムを届ける（報告の時に袋か持ち物から1つ渡す）
import { getItem } from '../../../../data/items';
import type { ObjectiveHandler } from './types';

declare module '../../../../types' {
  interface ObjectiveParams {
    deliverItem: { itemId: string };
  }
}

const has = (g: { pouch: { itemId: string }[]; stash: { itemId: string }[] }, id: string) => [...g.pouch, ...g.stash].some((i) => i.itemId === id);

export const objective: ObjectiveHandler<'deliverItem'> = {
  kind: 'deliverItem',
  goal: () => 1,
  canReport: (g, o) => has(g, o.itemId),
  onReport(g, o) {
    const i = g.pouch.findIndex((x) => x.itemId === o.itemId);
    if (i >= 0) g.pouch.splice(i, 1);
    else g.stash.splice(g.stash.findIndex((x) => x.itemId === o.itemId), 1);
  },
  describe: (o) => `「${getItem(o.itemId).name}」を届ける`,
};
