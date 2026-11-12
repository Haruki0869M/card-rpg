// 回3 A: 待っている側に「だれが・何を選んでいるか」を出す
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../data/items';
import { createGame } from '../../engine';
import type { GameState, PlayerId } from '../../types';
import { awaitedSeats } from './OnlineScreens';
import { chestClaimWaits, facilityWaits, rewardWaits } from './waitNotes';

function twoPlayers(): GameState {
  const g = createGame({
    seed: 3,
    scenarioId: 'corruptionKing',
    difficulty: 'normal',
    online: true,
    party: [
      { classId: 'warrior', gender: 'male', name: 'アレン', playerId: 'P1' },
      { classId: 'mage', gender: 'female', name: 'リナ', playerId: 'P2' },
    ],
  });
  return g;
}
const itemId = ITEMS.all.find((i) => i.slot)!.id;
const p1 = (p: PlayerId) => p === 'P1';

function reward(g: GameState, opts: { lu?: string; cards?: string[]; claim?: Record<string, 'need' | 'greed' | 'pass'> }) {
  g.mode = 'reward';
  g.reward = {
    gold: 10,
    exp: [],
    levelUps: opts.lu ? [{ heroId: opts.lu, level: 2, options: [] }] : [],
    cardOffers: ['h0', 'h1'].map((heroId) => ({ heroId, cardId: 'strike' })),
    cardDone: opts.cards ?? [],
    cardPicked: false,
    loot: [],
    ...(opts.claim ? { claim: { item: { uid: 'i1', itemId }, heroes: ['h0', 'h1'], choices: opts.claim } } : {}),
  };
  return g;
}

describe('回3 A: 待っている相手と、していること', () => {
  it('取り合いで「余れば」を押した P1 には、P2 がカードと取り合いを選んでいる事が出る', () => {
    const g = reward(twoPlayers(), { cards: ['h0'], claim: { h0: 'greed' } });
    const w = rewardWaits(g, p1);
    expect(w.map((n) => n.playerId)).toEqual(['P2', 'P2']);
    expect(w[0].what).toBe('リナの山札に加えるカードを選んでいます');
    expect(w[1].what).toContain('リナで、戦利品（');
    expect(w[1].what).toContain('）を欲しいか選んでいます');
  });

  it('P2 のレベルアップの成長の間: P1 には「レベルアップの成長を選んでいます」', () => {
    const g = reward(twoPlayers(), { lu: 'h1', cards: [] });
    const w = rewardWaits(g, p1);
    expect(w[0]).toEqual({ playerId: 'P2', what: 'リナのレベルアップの成長を選んでいます' });
  });

  it('1台で全員を動かす時（全員がこの端末）は、何も出さない', () => {
    const g = reward(twoPlayers(), { lu: 'h1', claim: {} });
    expect(rewardWaits(g, () => true)).toEqual([]);
  });

  it('宝箱の取り合い・施設も同じ形', () => {
    const g = twoPlayers();
    g.mode = 'chest';
    g.chest = { tile: 0, spec: { rarity: 'common', locked: false }, unlocked: true, claims: [{ item: { uid: 'i1', itemId }, heroes: ['h0', 'h1'], choices: { h0: 'need' } }] } as GameState['chest'];
    expect(chestClaimWaits(g, p1).map((n) => n.playerId)).toEqual(['P2']);
    g.mode = 'town';
    g.chest = undefined;
    g.town = { townId: 'x', heroId: 'h0', members: ['h0', 'h1'], finished: ['h0'] } as unknown as GameState['town'];
    expect(facilityWaits(g, p1)).toEqual([{ playerId: 'P2', what: 'リナで、まだ町を利用しています' }]);
  });

  it('切断した人を待っているか（代わりに操作の窓）: 報酬・取り合い・施設も数える', () => {
    const g = reward(twoPlayers(), { cards: ['h1'], claim: { h1: 'pass' } });
    expect(awaitedSeats(g)).toEqual(['P1']);
  });
});
