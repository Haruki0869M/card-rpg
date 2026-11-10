import { afterEach, describe, expect, it } from 'vitest';
import { applyGameCommand, createGame, reachable } from '../engine';
import { needsVote, voters } from '../engine/game/votes';
import type { GameCommand, GameState, PlayerId } from '../types';
import { actorOf, isLocalPlayer, setLocalPlayers } from './battleConfig';

afterEach(() => setLocalPlayers(null));

function eventOnP2() {
  const g = createGame({ seed: 874651857, scenarioId: 'corruptionKing', difficulty: 'normal', party:
    ['P1', 'P2'].map((playerId, i) => ({ playerId: playerId as PlayerId, classId: 'warrior', gender: 'male', name: `仲間${i}` })) });
  g.mode = 'event';
  g.world!.turn = 'h1';
  g.party = ['h1'];
  g.event = { eventId: 'rStrayBird', tile: g.world!.pos.h1, random: true };
  return g;
}

function send(g: GameState, cmd: GameCommand) {
  return applyGameCommand(g, { ...cmd, playerId: actorOf(g, cmd) } as GameCommand);
}

const choice: GameCommand = { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 3, focusUsed: 0 };
const finish: GameCommand = { type: 'FINISH_EVENT', playerId: 'P1' };

describe('画面から送る操作の担当者', () => {
  it('ローカル2人でP2の突発イベントの選択と先へ進むが通り、手番制限は残る', () => {
    const g = eventOnP2();
    expect(applyGameCommand(g, choice).error).toMatch(/手番/);
    const selected = send(g, choice);
    expect(selected.error).toBeUndefined();
    expect(selected.state.event?.result?.optionIndex).toBe(3);
    expect(applyGameCommand(selected.state, finish).error).toMatch(/手番/);
    const next = send(selected.state, finish);
    expect(next.error).toBeUndefined();
    expect(next.state.mode).toBe('world');
    expect(next.state.event).toBeUndefined();
  });

  const cases: [GameState['mode'], GameCommand][] = [
    ['event', choice], ['event', finish],
    ['chest', { type: 'LEAVE_CHEST', playerId: 'P1' }],
    ['shrine', { type: 'LEAVE_SHRINE', playerId: 'P1' }],
    ['encounter', { type: 'ENCOUNTER_CONTINUE', playerId: 'P1', participants: ['h1'] }],
    ['town', { type: 'TOWN_BUY', playerId: 'P1', kind: 'item', index: 0 }],
    ['town', { type: 'TOWN_INN', playerId: 'P1' }],
    ['town', { type: 'TOWN_SELL', playerId: 'P1', itemUid: '品物' }],
    ['town', { type: 'QUEST_ACCEPT', playerId: 'P1', questId: '依頼' }],
    ['town', { type: 'QUEST_REPORT', playerId: 'P1', questId: '依頼' }],
    ['town', { type: 'LEAVE_TOWN', playerId: 'P1' }],
  ];
  it.each(cases)('%sの%sをローカルではP2、オンラインでは押した席として送る', (mode, cmd) => {
    const g = eventOnP2();
    g.mode = mode;
    g.chest = { tile: 0, spec: { rarity: 'common', locked: false }, unlocked: false };
    g.town = { townId: '町', heroId: 'h1' };
    g.shrine = { shrineId: '祠', tile: 0, heroId: 'h1' };
    g.encounter = { wandererId: '敵', tile: 0, heroId: 'h1', candidates: ['h1'] };
    expect(actorOf(g, cmd)).toBe('P2');
    setLocalPlayers(['P1']);
    expect(actorOf(g, cmd)).toBe('P1');
    setLocalPlayers(['P2']);
    expect(actorOf(g, cmd)).toBe('P2');
  });

  it('オンラインのP1はP2のイベントを進められず、P2は選択と続行ができる', () => {
    const g = eventOnP2();
    setLocalPlayers(['P1']);
    expect(send(g, choice).error).toMatch(/手番/);
    setLocalPlayers(['P2']);
    const selected = send(g, choice);
    expect(selected.error).toBeUndefined();
    setLocalPlayers(['P1']);
    expect(send(selected.state, finish).error).toMatch(/手番/);
    setLocalPlayers(['P2']);
    expect(send(selected.state, finish).state.mode).toBe('world');
  });

  it('キャラ指定の行商人操作では、そのキャラの担当者を維持する', () => {
    const g = eventOnP2();
    expect(actorOf(g, { type: 'PEDDLER_BUY', playerId: 'P1', heroId: 'h1' })).toBe('P2');
    expect(actorOf(g, { ...choice, heroId: 'h0' })).toBe('P1');
  });

  it('ダンジョンのイベントはローカル全員の投票で決まり、オンラインでは各席の票だけを送る', () => {
    const g = eventOnP2();
    g.activeScene = '探索中';
    g.party = ['h0', 'h1'];
    g.event = { eventId: 'rStrayBird', roomId: '部屋' };
    expect(actorOf(g, choice)).toBe('P1');
    expect(needsVote(g, choice)).toBe(true);
    expect(voters(g).filter(isLocalPlayer)).toEqual(['P1', 'P2']);
    const first = applyGameCommand(g, { type: 'VOTE', playerId: 'P1', command: choice });
    expect(first.error).toBeUndefined();
    expect(first.state.event?.result).toBeUndefined();
    const second = applyGameCommand(first.state, { type: 'VOTE', playerId: 'P2', command: { ...choice, playerId: 'P2' } });
    expect(second.error).toBeUndefined();
    expect(second.state.event?.result?.optionIndex).toBe(3);
    for (const seat of ['P1', 'P2'] as PlayerId[]) {
      setLocalPlayers([seat]);
      expect(actorOf(g, choice)).toBe(seat);
      expect(voters(g).filter(isLocalPlayer)).toEqual([seat]);
    }
  });
});

// 1台を回して遊ぶ時、P2 の番に他の人のキャラを連れて動くと、移動先の提案への返事が「今の手番の人（P2）」として送られて
// 「この提案に答える人ではありません」で止まっていた（レビュー資料 2026-11-09）。返事に同行キャラの heroId を付けて、その担当として送る。
describe('同行の移動の提案への返事（担当の違う仲間を連れて動く）', () => {
  const party = (n: number) => (['P1', 'P2', 'P3', 'P4'] as PlayerId[]).slice(0, n).map((playerId, i) => ({ playerId, classId: 'warrior', gender: 'male' as const, name: `仲間${i}` }));
  /** P2（h1）の番で、全員が同じマスにいて、P2 がほかの全員を誘って承知してもらい、移動先を提案した所 */
  function proposedByP2(n: number) {
    let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: party(n) });
    g.world!.story = undefined;
    const w = g.world!;
    const start = w.pos.h0;
    for (const h of g.heroes) w.pos[h.id] = start;
    w.turn = 'h1';
    w.acted = ['h0'];
    const others = g.heroes.filter((h) => h.id !== 'h1');
    for (const c of others) {
      g = send(g, { type: 'WORLD_INVITE', playerId: 'P2', heroId: 'h1', targetId: c.id }).state;
      g = send(g, { type: 'WORLD_INVITE_ANSWER', playerId: c.playerId, heroId: c.id, accept: true }).state;
    }
    const rolled = send(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P2', heroId: 'h1' });
    expect(rolled.error).toBeUndefined();
    g = rolled.state;
    const to = [...reachable(g.world!, start, g.world!.move ?? 0).keys()].find((t) => t !== start)!;
    const moved = send(g, { type: 'WORLD_MOVE', playerId: 'P2', heroId: 'h1', to, companions: others.map((h) => h.id) });
    expect(moved.error).toBeUndefined();
    expect(moved.state.world!.moveProposal?.owners.sort()).toEqual(others.map((h) => h.playerId).sort());
    return { g: moved.state, start, others };
  }
  /** 画面のボタンと同じ形の返事（返事をする担当の同行キャラを付ける） */
  const agree = (g: GameState, p: PlayerId): GameCommand => {
    const heroId = g.world!.moveProposal!.companions.find((id) => g.heroes.find((h) => h.id === id)?.playerId === p);
    return { type: 'WORLD_MOVE_AGREE', playerId: p, heroId, accept: true };
  };

  for (const n of [2, 3, 4]) {
    it(`1台で${n}人: P2 の番に全員を連れて、各担当の「一緒に行く」で全員が動く`, () => {
      let { g, start, others } = proposedByP2(n);
      // heroId が無い返事は、今の手番の P2 として送られて弾かれる（直す前の動き）
      expect(actorOf(g, { type: 'WORLD_MOVE_AGREE', playerId: 'P1', accept: true })).toBe('P2');
      for (const c of others) {
        expect(actorOf(g, agree(g, c.playerId))).toBe(c.playerId);
        const r = send(g, agree(g, c.playerId));
        expect(r.error).toBeUndefined();
        g = r.state;
      }
      const w = g.world!;
      expect(w.moveProposal).toBeUndefined();
      expect(w.pos.h1).not.toBe(start);
      for (const h of g.heroes) expect(w.pos[h.id]).toBe(w.pos.h1);
    });
  }

  it('オンラインでは、返事はその担当の席として送られ、ほかの席の名前では送れない', () => {
    const { g, others } = proposedByP2(3);
    for (const c of others) {
      setLocalPlayers([c.playerId]);
      expect(actorOf(g, agree(g, c.playerId))).toBe(c.playerId);
      expect(isLocalPlayer(actorOf(g, agree(g, c.playerId)))).toBe(true);
      // P2 の端末から P1 の返事を送ろうとしても、P1 の担当として扱われ、P2 の端末の操作にはならない
      setLocalPlayers(['P2']);
      expect(isLocalPlayer(actorOf(g, agree(g, c.playerId)))).toBe(false);
    }
  });
});
