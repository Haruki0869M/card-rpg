// 店の相談（ステップ2）: 残りの数・仲間が買った時のお知らせの文・2人以上か
import { describe, expect, it } from 'vitest';
import { createGame } from '../../engine';
import type { PlayerId, ShopStock } from '../../types';
import { severalPlayers, shopLeft, soldNotices } from './shopTalk';

const game = (players: PlayerId[]) =>
  createGame({ seed: 2, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((p, i) => ({ classId: 'warrior', gender: 'male', name: `仲間${i}`, playerId: p })) });

describe('店の相談', () => {
  it('残りの数は同じ品物の売れ残りの数', () => {
    const stock: ShopStock = {
      refreshedAt: 0,
      cards: [],
      items: [
        { kind: 'item', item: { uid: 'a', itemId: 'potion' }, price: 10 },
        { kind: 'item', item: { uid: 'b', itemId: 'potion' }, price: 10, sold: true },
        { kind: 'item', item: { uid: 'c', itemId: 'potion' }, price: 10 },
      ],
    };
    expect(shopLeft(stock, 'potion')).toBe(2);
  });
  it('仲間が買った物だけお知らせする（この端末で買った物・前から売れていた物は出さない）', () => {
    const g = game(['P1', 'P2']);
    g.heroes[1].pouch.push({ uid: 'a', itemId: 'potion' });
    const stock: ShopStock = {
      refreshedAt: 0,
      cards: [],
      items: [
        { kind: 'item', item: { uid: 'a', itemId: 'potion' }, price: 10, sold: true },
        { kind: 'item', item: { uid: 'b', itemId: 'potion' }, price: 10, sold: true },
        { kind: 'item', item: { uid: 'c', itemId: 'potion' }, price: 10, sold: true },
      ],
    };
    const texts = soldNotices(g, stock, new Set(['c']), new Set(['b']));
    expect(texts).toHaveLength(1);
    expect(texts[0]).toMatch(/^仲間1が.+を買った（残り0）$/);
  });
  it('2人以上のプレイヤーか（1台で全員 P1 なら確かめない）', () => {
    expect(severalPlayers(game(['P1', 'P2']))).toBe(true);
    expect(severalPlayers(game(['P1', 'P1']))).toBe(false);
  });
});
