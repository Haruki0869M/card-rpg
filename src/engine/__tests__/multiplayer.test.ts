// ===== 複数人で遊ぶ時のルール（M3-C）: みんなで決める・手番の人だけが操作・同行の誘い・戦闘への参加 =====
import { describe, expect, it } from 'vitest';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, createGame, findHero, notVoted, reachable, viewOf, votesFor } from '../index';

const reachableFrom = (g: GameState, t: number) => reachable(g.world!, t, g.world!.move ?? 0).keys();

const party = (players: PlayerId[]) => players.map((p, i) => ({ classId: ['warrior', 'mage', 'guardian'][i], gender: 'male' as const, name: `h${i}`, playerId: p }));
const newWorld = (players: PlayerId[]) => createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: party(players) });
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const tileOf = (g: GameState, kind: string, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === kind && t.f.id === id);

const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });

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
  // 2人とも入ったので、ワールドターンが進んでダンジョンの番。判定するキャラをみんなで決めてから、探索力を決める
  const x = g.expeditions![0].id;
  g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: { type: 'EXPLORE_ROLLER', playerId: 'P1', heroId: 'h0' } }));
  g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: { type: 'EXPLORE_ROLLER', playerId: 'P2', heroId: 'h0' } }));
  g = run(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: 'P1', heroId: 'h0', focusUsed: 0 }));
  return { g, x };
}

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

  it('部屋の選択は全員一致。意見が割れたら決まらず、選び直しで決まる（指摘1）', () => {
    let { g, x } = inTemple();
    g.expeditions![0].mode = 'dungeon';
    const enter: GameCommand = { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' };
    const retreat: GameCommand = { type: 'RETREAT', playerId: 'P2' };
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: retreat }));
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: null }));
    expect(notVoted(viewOf(g, x))).toEqual(['P1', 'P2']);
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: retreat }));
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: enter }));
    // 1対1でも、部屋の選択が入っていれば決まらない
    expect(g.expeditions).toHaveLength(1);
    expect(viewOf(g, x).dungeon!.currentRoomId).toBeUndefined();
    expect(votesFor(viewOf(g, x), enter)).toEqual(['P1']);
    // P2 が同じ部屋に選び直すと決まる
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: { ...enter, playerId: 'P2' } }));
    expect(viewOf(g, x).dungeon!.currentRoomId).toBe('r0c0');
  });

  it('1人だけ（全員が同じプレイヤー）なら、すぐに決まる', () => {
    let g = newWorld(['P1', 'P1']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const t = tileOf(g, 'dungeon', 'emeraldTemple');
    g.world!.pos.h0 = g.world!.pos.h1 = t;
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
    g = run(g, inScene(g.expeditions![0].id, { type: 'EXPLORE_ROLL', playerId: 'P1', heroId: 'h0', focusUsed: 0 }));
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

describe('報酬はみんなに（M3-C4・C5）', () => {
  /** 2人で最初の部屋の戦闘に勝って、報酬の画面へ */
  function wonBattle() {
    let { g, x } = inTemple();
    const enter: GameCommand = { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' };
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: enter }));
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: { ...enter, playerId: 'P2' } }));
    const b = g.expeditions![0].battle!;
    b.enemies.forEach((e) => ((e.dead = true), (e.hp = 0)));
    b.phase = 'victory';
    g = run(g, inScene(x, { type: 'FINISH_BATTLE', playerId: 'P1' }));
    expect(viewOf(g, x).mode).toBe('reward');
    return { g, x };
  }

  it('カードは生き残ったキャラごとに3枚。2人とも自分のキャラの分を選べ、他人の分は選べない', () => {
    let { g, x } = wonBattle();
    const r = viewOf(g, x).reward!;
    expect(new Set(r.cardOffers.map((o) => o.heroId))).toEqual(new Set(['h0', 'h1']));
    const h1Offer = r.cardOffers.findIndex((o) => o.heroId === 'h1');
    expect(applyGameCommand(g, inScene(x, { type: 'PICK_CARD', playerId: 'P1', offerIndex: h1Offer })).error).toMatch(/担当/);
    g = run(g, inScene(x, { type: 'PICK_CARD', playerId: 'P2', offerIndex: h1Offer }));
    g = run(g, inScene(x, { type: 'PICK_CARD', playerId: 'P1', offerIndex: null }));
    expect(viewOf(g, x).reward!.cardPicked).toBe(true);
    expect(findHero(g, 'h1')!.deck.length).toBe(findHero(newWorld(['P1', 'P2']), 'h1')!.deck.length + 1);
  });

  it('戦利品は取り合い: 欲しい人がいればその人へ（運の判定）。全員そろうまで決まらない', () => {
    let { g, x } = wonBattle();
    const item = { uid: 'loot1', itemId: findHero(g, 'h0')!.equipment.weapon!.itemId };
    g.expeditions![0].reward!.claim = { item, heroes: ['h0', 'h1'], choices: {} };
    g = run(g, inScene(x, { type: 'CLAIM_LOOT', playerId: 'P1', heroId: 'h0', choice: 'greed' }));
    expect(viewOf(g, x).reward!.claim!.winner).toBeUndefined();
    expect(applyGameCommand(g, inScene(x, { type: 'CLAIM_LOOT', playerId: 'P1', heroId: 'h1', choice: 'pass' })).error).toMatch(/担当/);
    g = run(g, inScene(x, { type: 'CLAIM_LOOT', playerId: 'P2', heroId: 'h1', choice: 'need' }));
    const c = viewOf(g, x).reward!.claim!;
    expect(c.winner).toBe('h1');
    expect(c.rolls!.map((r) => r.heroId)).toEqual(['h1']);
    expect(findHero(g, 'h1')!.stash.some((i) => i.uid === 'loot1')).toBe(true);
  });
});

describe('同行（指摘1）', () => {
  it('同行は手番が変わっても続き、ダンジョンにも一緒に入る。他の人のキャラと動く時は、その人の同意で動く', () => {
    let g = newWorld(['P1', 'P2']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const w = g.world!;
    const start = w.pos.h0;
    w.pos.h1 = start;
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P2', heroId: 'h1', accept: true });
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h0', focusUsed: 4 });
    const to = [...reachableFrom(g, start)].find((t) => t !== start)!;
    g = run(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to, companions: ['h1'] });
    // 提案だけ。P2 が同意するまで動かない
    expect(g.world!.pos.h0).toBe(start);
    expect(g.world!.moveProposal?.owners).toEqual(['P2']);
    expect(applyGameCommand(g, { type: 'WORLD_MOVE_AGREE', playerId: 'P1', accept: true }).error).toBeDefined();
    g = run(g, { type: 'WORLD_MOVE_AGREE', playerId: 'P2', accept: true });
    expect(g.world!.pos.h0).not.toBe(start);
    expect(g.world!.pos.h1).toBe(g.world!.pos.h0);
    // 手番が変わっても同行は続く
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' });
    expect(g.world!.follow).toEqual({ h1: 'h0' });
  });
});
