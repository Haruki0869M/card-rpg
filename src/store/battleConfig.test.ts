import { afterEach, describe, expect, it } from 'vitest';
import { applyGameCommand, createGame } from '../engine';
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
