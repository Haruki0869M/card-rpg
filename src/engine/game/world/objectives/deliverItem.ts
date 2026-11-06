// アイテムを届ける（報告の時に袋か持ち物から1つ渡す）
import { getItem } from '../../../../data/items';
import type { ObjectiveHandler } from './types';

declare module '../../../../types' {
  interface ObjectiveParams {
    deliverItem: { itemId: string };
  }
}

import type { GameState } from '../../../../types';

/** 報告するキャラ（町に入ったキャラ） */
const reporter = (g: GameState) => g.heroes.find((h) => h.id === g.town?.heroId);
const has = (g: GameState, id: string) => {
  const h = reporter(g);
  return !!h && [...h.pouch, ...h.stash].some((i) => i.itemId === id);
};

export const objective: ObjectiveHandler<'deliverItem'> = {
  kind: 'deliverItem',
  goal: () => 1,
  canReport: (g, o) => has(g, o.itemId),
  onReport(g, o) {
    const h = reporter(g);
    if (!h) return;
    const i = h.pouch.findIndex((x) => x.itemId === o.itemId);
    if (i >= 0) h.pouch.splice(i, 1);
    else h.stash.splice(h.stash.findIndex((x) => x.itemId === o.itemId), 1);
  },
  describe: (o) => `「${getItem(o.itemId).name}」を届ける`,
};
