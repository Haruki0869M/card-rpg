// ===== 複数人で遊ぶ時のルール（M3-C）: みんなで決める・手番の人だけが操作・同行の誘い・戦闘への参加 =====
import { describe, expect, it } from 'vitest';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, createGame, findHero, notVoted, viewOf, votesFor } from '../index';

const party = (players: PlayerId[]) => players.map((p, i) => ({ classId: ['warrior', 'mage', 'guardian'][i], gender: 'male' as const, name: `h${i}`, playerId: p }));
const newWorld = (players: PlayerId[]) => createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: party(players) });
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const tileOf = (g: GameState, kind: string, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === kind && t.f.id === id);

/** P1・P2 の2人でダンジョンに入る */
function inTemple() {
  let g = newWorld(['P1', 'P2']);
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  const t = tileOf(g, 'dungeon', 'emeraldTemple');
  g.world!.pos.h0 = g.world!.pos.h1 = t;
  // P2 のキャラは、誘って承知してもらってから一緒に入る
  const without = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
  expect(without.expeditions![0].heroes).toEqual(['h0']);
  g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
  g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P2', heroId: 'h1', accept: true });
  g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
  expect(g.expeditions![0].heroes).toEqual(['h0', 'h1']);
  return { g, x: g.expeditions![0].id };
}
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });

describe('みんなで決める（ダンジョンの中）', () => {
  it('次の部屋は、2人とも選ぶまで決まらない。選んだ人が見える', () => {
    let { g, x } = inTemple();
    const enter: GameCommand = { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' };
    // 1人では直接進めない
    expect(applyGameCommand(g, inScene(x, enter)).error).toMatch(/みんなで/);
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: enter }));
    expect(viewOf(g, x).dungeon!.currentRoomId).toBeUndefined();
    expect(votesFor(viewOf(g, x), enter)).toEqual(['P1']);
    expect(notVoted(viewOf(g, x))).toEqual(['P2']);
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: { ...enter, playerId: 'P2' } }));
    expect(viewOf(g, x).dungeon!.currentRoomId).toBe('r0c0');
    expect(viewOf(g, x).vote).toBeUndefined();
  });

  it('意見が割れたら、先頭のキャラ（入った人）の選択になる。選び直しもできる', () => {
    let { g, x } = inTemple();
    g.expeditions![0].mode = 'dungeon';
    const enter: GameCommand = { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' };
    const retreat: GameCommand = { type: 'RETREAT', playerId: 'P2' };
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: retreat }));
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: null }));
    expect(notVoted(viewOf(g, x))).toEqual(['P1', 'P2']);
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: retreat }));
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: enter }));
    // 1対1 → P1（h0 が先頭）の「部屋に入る」
    expect(g.expeditions).toHaveLength(1);
    expect(viewOf(g, x).dungeon!.currentRoomId).toBe('r0c0');
  });

  it('1人だけ（全員が同じプレイヤー）なら、すぐに決まる', () => {
    let g = newWorld(['P1', 'P1']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const t = tileOf(g, 'dungeon', 'emeraldTemple');
    g.world!.pos.h0 = g.world!.pos.h1 = t;
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
    g = run(g, inScene(g.expeditions![0].id, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    expect(viewOf(g, g.expeditions![0].id).dungeon!.currentRoomId).toBe('r0c0');
  });
});

describe('手番の人だけが操作する（世界マップ）', () => {
  it('町・遭遇は、手番のキャラの担当しか操作できない', () => {
    let g = newWorld(['P1', 'P2']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' });
    expect(applyGameCommand(g, { type: 'TOWN_INN', playerId: 'P2' }).error).toBeDefined();
    expect(applyGameCommand(g, { type: 'LEAVE_TOWN', playerId: 'P2' }).error).toBeDefined();
  });
});

describe('同行の誘い', () => {
  it('他の人のキャラは、誘って承知してもらうと一緒に動ける。断られたら連れて行けない', () => {
    let g = newWorld(['P1', 'P2']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h0', focusUsed: 0 });
    const w = g.world!;
    const to = [...Array(w.tiles.length).keys()].find((i) => i !== w.pos.h0 && Math.abs(i - w.pos.h0) <= 1 && !w.wanderers.some((x) => x.tile === i))!;
    const move: GameCommand = { type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to, companions: ['h1'] };
    expect(applyGameCommand(g, move).error).toMatch(/誘って/);
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    expect(applyGameCommand(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P1', heroId: 'h1', accept: true }).error).toBeDefined();
    const declined = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P2', heroId: 'h1', accept: false });
    expect(applyGameCommand(declined, move).error).toBeDefined();
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P2', heroId: 'h1', accept: true });
    const r = applyGameCommand(g, move);
    if (!r.error) expect(r.state.world!.pos.h1).toBe(r.state.world!.pos.h0);
    else expect(r.error).toMatch(/移動/);
  });
});

describe('遭遇の戦闘への参加', () => {
  it('隣のマスの他の人のキャラは、自分で「加わる」と答えた時だけ参加する', () => {
    let g = newWorld(['P1', 'P2']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const w = g.world!;
    const wd = w.wanderers[0];
    w.pos.h0 = wd.tile;
    w.pos.h1 = [...Array(w.tiles.length).keys()].find((i) => i !== wd.tile && Math.abs(i - wd.tile) === 1)!;
    g.encounter = { wandererId: wd.id, tile: wd.tile, heroId: 'h0', candidates: ['h0', 'h1'] };
    g.mode = 'encounter';
    const fight: GameCommand = { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0', 'h1'] };
    expect(applyGameCommand(g, fight).error).toMatch(/加わって/);
    // P2 しか答えられない。P2 は決められない
    expect(applyGameCommand(g, { type: 'ENCOUNTER_JOIN', playerId: 'P1', heroId: 'h1', join: true }).error).toBeDefined();
    expect(applyGameCommand(g, { ...fight, playerId: 'P2' } as GameCommand).error).toBeDefined();
    g = run(g, { type: 'ENCOUNTER_JOIN', playerId: 'P2', heroId: 'h1', join: true });
    g = run(g, fight);
    expect(g.battle!.allies.map((a) => a.id)).toEqual(['h0', 'h1']);
    expect(findHero(g, 'h1')).toBeDefined();
  });
});
