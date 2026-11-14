// さすらいの行商人: 安い特別ショップ（レア以上の武器・装飾品と、他の系統のカード）
import { BALANCE } from '../../../../data/balance';
import { CARDS } from '../../../../data/cards';
import { CLASSES, getClass } from '../../../../data/classes';
import { ITEMS } from '../../../../data/items';
import { rarityIndex } from '../../dungeon';
import { jobWeapons } from '../../hero';
import { finisherCards } from '../../jobs';
import { scourgeHeldGear } from '../../world/scourgeGear';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    /** discount: 値引き（%）。rarity: 品物の格の範囲（0=コモン〜3=レジェンド。省略は1〜2。段階6の行商人は珍しい品） */
    peddler: { discount: number; rarity?: [number, number] };
  }
}

export const outcome: OutcomeHandler<'peddler'> = {
  kind: 'peddler',
  apply(ctx, o) {
    const h = ctx.targets()[0];
    if (!h) return;
    const { rng, game } = ctx;
    const k = (100 - o.discount) / 100;
    const [lo, hi] = o.rarity ?? [1, 2];
    // 災厄だけが落とす品（区切り3a）は並べない
    const held = scourgeHeldGear(game);
    const goods = ITEMS.all.filter(
      (i) => !i.source && (!i.scenario || i.scenario === game.scenarioId) && !held.has(i.id) &&(i.slot === 'weapon' ? jobWeapons(h.classId).includes(i.weaponType ?? '') : i.slot === 'accessory') && rarityIndex(i.rarity) >= lo && rarityIndex(i.rarity) <= hi,
    );
    const items = [];
    for (let n = 0; n < 2 && goods.length; n++) {
      const def = goods.splice(rng.int(goods.length), 1)[0];
      items.push({ item: { uid: `i${game.nextUid++}`, itemId: def.id }, price: Math.round((BALANCE.itemPrice[def.rarity] ?? 60) * k) });
    }
    // 他の系統のジョブのカード（レア以上）
    const lin = getClass(h.classId).lineage;
    // 決め技（転職でだけ入る札）は並べない
    const fin = finisherCards();
    const pool = [...new Set(CLASSES.all.filter((c) => c.lineage && c.lineage !== lin).flatMap((c) => c.cardPool))].filter((id) => CARDS.has(id) && !fin.has(id) && rarityIndex(CARDS.get(id).rarity ?? 'common') >= Math.min(lo, 2));
    const cards = [];
    for (let n = 0; n < 2 && pool.length; n++) {
      const id = pool.splice(rng.int(pool.length), 1)[0];
      cards.push({ cardId: id, price: Math.round((BALANCE.cardPrice[CARDS.get(id).rarity ?? 'rare'] ?? 75) * k) });
    }
    h.peddler = { items, cards };
  },
  describe: (o) => `特別ショップ（${o.discount}%引き）`,
};
