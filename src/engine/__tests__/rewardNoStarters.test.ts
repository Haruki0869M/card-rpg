// フェーズ3（オーナーの決定 A）: 報酬と店に基本のカード（基本ジョブ8つの最初の山札の21種）を出さない・同じキャラの3枚で同じ名前を重ねない
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { TOWNS } from '../../data/world';
import type { GameState, PlayerId } from '../../types';
import { createGame, createRng } from '../index';
import { baseStarterCardIds } from '../game/cardTags';
import { heroJobCardPool } from '../game/jobs';
import { rollCardOffers } from '../game/loot';
import { ensureShop } from '../game/world/town';

const game = (classes: string[], seed = 3): GameState =>
  createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: 'P1' as PlayerId })) });

describe('報酬と店から基本のカードを外す（フェーズ3）', () => {
  it('基本のカードは21種（ストライク・ガードなど）', () => {
    const ids = baseStarterCardIds();
    expect(ids.size).toBe(21);
    const names = [...ids].map((id) => CARDS.get(id).name);
    for (const n of ['ストライク', 'ガード', '癒し', 'マジックアロー']) expect(names).toContain(n);
  });

  it('全ジョブ・200種: 基本のカードが出ない・同じ名前が重ならない・3枚出る・1枚目はジョブ寄り', () => {
    const starters = baseStarterCardIds();
    for (const c of CLASSES.all) {
      const g = game(['warrior']);
      const h = g.heroes[0];
      h.classId = c.id;
      for (let seed = 1; seed <= 200; seed++) {
        const offers = rollCardOffers(g, [h.id], createRng(seed * 31 + 7));
        expect(offers.length, `${c.id} seed${seed}`).toBe(3);
        for (const o of offers) expect(starters.has(o.cardId), `${c.id} ${o.cardId}`).toBe(false);
        const names = offers.map((o) => CARDS.get(o.cardId).name);
        expect(new Set(names).size, `${c.id} ${names}`).toBe(3);
        expect(heroJobCardPool(h), `${c.id} seed${seed}`).toContain(offers[0].cardId);
      }
    }
  }, 60000);

  it('町の店のカード売り場にも基本のカードを並べない', () => {
    const starters = baseStarterCardIds();
    for (let seed = 1; seed <= 40; seed++) {
      const g = game(['warrior', 'priest', 'mage', 'thief'], seed);
      for (const town of TOWNS.all) {
        g.town = { townId: town.id, heroId: g.heroes[0].id } as GameState['town'];
        g.world!.shops = {};
        const stock = ensureShop(g, createRng(seed));
        for (const c of stock.cards) expect(starters.has(c.cardId), `${town.id} ${c.cardId}`).toBe(false);
      }
    }
  }, 60000);
});
