// 回3 A: 待っている側に「だれが・何を選んでいるか」を出す
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../data/items';
import { createGame, voteCtx } from '../../engine';
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
  it('取り合いで「余れば」を押した P1 には、P2 が取り合いを選んでいる事が出る（④(1): 取り合いはカードが全員終わってから）', () => {
    const g = reward(twoPlayers(), { cards: ['h0', 'h1'], claim: { h0: 'greed' } });
    const w = rewardWaits(g, p1);
    expect(w.map((n) => n.playerId)).toEqual(['P2']);
    expect(w[0].what).toContain('リナで、戦利品（');
    expect(w[0].what).toContain('）を欲しいか選んでいます');
  });

  it('④(1): P2 のカードがまだの間は、取り合いの待ちは書かない（P2 にはまだ取り合いが見えていない）', () => {
    const g = reward(twoPlayers(), { cards: ['h0'], claim: { h0: 'greed' } });
    expect(rewardWaits(g, p1)).toEqual([{ playerId: 'P2', what: 'リナの山札に加えるカードを選んでいます' }]);
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

  it('ホストの引き継ぎの直し: ダンジョンの扉の投票で、まだ選んでいない席も待っている（代わりに操作の窓を出す）', () => {
    const g = twoPlayers();
    g.mode = 'dungeon';
    g.activeScene = 'x1';
    // だれも選んでいない: 2人とも待っている
    expect(awaitedSeats(g)).toEqual(['P1', 'P2']);
    // P1 が扉を選んだ: P2 を待っている
    g.vote = { ctx: voteCtx(g), picks: { P1: { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r1' } } };
    expect(awaitedSeats(g)).toEqual(['P2']);
    // 場面にいるのが1人の席だけなら、投票は無いので待たない
    g.party = [g.heroes[0].id];
    expect(awaitedSeats(g)).toEqual([]);
    // 戦闘中・世界マップは今のまま（投票で待たない）
    g.party = undefined;
    g.mode = 'battle';
    expect(awaitedSeats(g)).toEqual([]);
  });

  it('切断した人を待っているか（代わりに操作の窓）: 報酬・取り合い・施設も数える', () => {
    const g = reward(twoPlayers(), { cards: ['h1'], claim: { h1: 'pass' } });
    // P2 は選び終えて「続ける」も押した: P1 だけを待っている
    g.vote = { ctx: voteCtx(g), picks: { P2: { type: 'FINISH_REWARD', playerId: 'P2' } } };
    expect(awaitedSeats(g)).toEqual(['P1']);
    // ホストの引き継ぎの直し: P2 が「続ける」をまだ押していなければ、P2 も待っている（報酬の「続ける」は全員の票で決まる）
    g.vote = undefined;
    expect(awaitedSeats(g)).toEqual(['P1', 'P2']);
  });
});
