// 装備の詳細の「今と比べて」（Step A ①）: 数値の差・特殊能力の入れ替わり・カードの増減
import { describe, expect, it } from 'vitest';
import { compareItems, diffLine, itemOwnStats } from '../../components/equipDiff';
import { ITEMS } from '../../data/items';
import type { Hero, ItemDef } from '../../types';

const heroWith = (cur?: ItemDef): Hero => ({ equipment: cur ? { [cur.slot]: { uid: 'u1', itemId: cur.id } } : {} }) as unknown as Hero;

const weapons = ITEMS.all.filter((i) => i.slot === 'weapon');
const withAbility = weapons.find((i) => i.ability && i.cards?.length)!;
const plainWithCards = weapons.find((i) => !i.ability && i.cards?.length && i.cards[0].cardId !== withAbility.cards![0].cardId)!;

describe('装備の比較', () => {
  it('同じ物と比べると「変わらない」', () => {
    const c = compareItems(heroWith(withAbility), 'weapon', withAbility);
    expect(c.same).toBe(true);
    expect(c.ability).toBeNull();
  });

  it('特殊能力の入れ替わりとカードの増減が出る', () => {
    const c = compareItems(heroWith(plainWithCards), 'weapon', withAbility);
    expect(c.current?.id).toBe(plainWithCards.id);
    expect(c.ability).toEqual({ from: null, to: withAbility.ability!.name });
    expect(c.cardsGained.map((x) => x.cardId)).toEqual(withAbility.cards!.map((x) => x.cardId));
    expect(c.cardsLost.map((x) => x.cardId)).toEqual(plainWithCards.cards!.map((x) => x.cardId));
    expect(c.same).toBe(false);
  });

  it('何も付けていない時は、その装備の数値がそのまま差になる', () => {
    const it = ITEMS.all.find((i) => i.slot === 'accessory' && i.stats && Object.values(i.stats).some((v) => v))!;
    const c = compareItems(heroWith(), 'accessory', it);
    expect(c.current).toBeNull();
    const own = Object.values(it.stats!).filter((v) => v).length + [it.maxHp, it.focusMax, it.startBlock, it.extraDraw].filter((v) => v).length;
    expect(c.stats.length).toBe(own);
    expect(diffLine(c.stats).length).toBeGreaterThan(0);
  });

  it('外すと数値がマイナスになる（自分の数値と取り違えない）', () => {
    const it = ITEMS.all.find((i) => i.slot === 'armor' && i.stats && Object.values(i.stats).some((v) => (v ?? 0) > 0))!;
    const c = compareItems(heroWith(it), 'armor', null);
    expect(c.stats.length).toBeGreaterThan(0);
    expect(c.stats.filter((d) => d.delta > 0)).toEqual([]);
    expect(itemOwnStats(it).some((s) => s.includes('+'))).toBe(true);
  });
});
