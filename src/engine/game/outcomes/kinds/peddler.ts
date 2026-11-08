// さすらいの行商人: 安い特別ショップ（レア以上の武器・装飾品と、他の系統のカード）
import { BALANCE } from '../../../../data/balance';
import { CARDS } from '../../../../data/cards';
import { CLASSES, getClass } from '../../../../data/classes';
import { ITEMS } from '../../../../data/items';
import { rarityIndex } from '../../dungeon';
import { jobWeapons } from '../../hero';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    /** discount: 値引き（%） */
    peddler: { discount: number };
  }
}

export const outcome: OutcomeHandler<'peddler'> = {
  kind: 'peddler',
  apply(ctx, o) {
    const h = ctx.targets()[0];
    if (!h) return;
    const { rng, game } = ctx;
    const k = (100 - o.discount) / 100;
    const goods = ITEMS.all.filter(
      (i) => (!i.scenario || i.scenario === game.scenarioId) && (i.slot === 'weapon' ? jobWeapons(h.classId).includes(i.weaponType ?? '') : i.slot === 'accessory') && rarityIndex(i.rarity) >= 1 && rarityIndex(i.rarity) <= 2,
    );
    const items = [];
    for (let n = 0; n < 2 && goods.length; n++) {
      const def = goods.splice(rng.int(goods.length), 1)[0];
      items.push({ item: { uid: `i${game.nextUid++}`, itemId: def.id }, price: Math.round((BALANCE.itemPrice[def.rarity] ?? 60) * k) });
    }
    // 他の系統のジョブのカード（レア以上）
    const lin = getClass(h.classId).lineage;
    const pool = [...new Set(CLASSES.all.filter((c) => c.lineage && c.lineage !== lin).flatMap((c) => c.cardPool))].filter((id) => CARDS.has(id) && rarityIndex(CARDS.get(id).rarity ?? 'common') >= 1);
    const cards = [];
    for (let n = 0; n < 2 && pool.length; n++) {
      const id = pool.splice(rng.int(pool.length), 1)[0];
      cards.push({ cardId: id, price: Math.round((BALANCE.cardPrice[CARDS.get(id).rarity ?? 'rare'] ?? 75) * k) });
    }
    h.peddler = { items, cards };
  },
  describe: (o) => `特別ショップ（${o.discount}%引き）`,
};
