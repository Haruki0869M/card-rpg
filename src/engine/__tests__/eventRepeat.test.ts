// 1つのダンジョンの中で、同じイベントを繰り返さない（オーナー承認）
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { EVENTS } from '../../data/events';
import { applyGameCommand, createGame, createRng } from '../index';
import { roomBehavior } from '../game/rooms';
import { freshEventId } from '../game/rooms/behaviors/event';

/** 同じイベントの部屋を n 個足す（40行に大きくしていた頃の保存の形。今の並びは、1つのダンジョンに同じイベントを置いていない） */
function repeatEvents(g: GameState, n: number): GameState {
  const run = g.dungeon!;
  const first = run.rooms.find((r) => r.type === 'event')!;
  for (let i = 0; i < n; i++) run.rooms.push({ ...first, id: `x${i}`, cleared: false });
  return g;
}

function inTemple(): GameState {
  const g = createGame({ seed: 5, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: '仲間', playerId: 'P1' }] });
  g.world = undefined;
  g.mode = 'hub';
  const r = applyGameCommand(g, { type: 'ENTER_DUNGEON', playerId: 'P1', dungeonId: 'emeraldTemple' });
  expect(r.error).toBeUndefined();
  return r.state;
}
const pool = (g: GameState) => EVENTS.forScenario(g.scenarioId).filter((e) => !e.where || e.where === 'dungeon').map((e) => e.id);

describe('同じイベントを繰り返さない', () => {
  it('今の翠の神殿は、同じイベントの部屋が無い。古い形（40行）の保存には、同じイベントの部屋がいくつもある（替える前提の確認）', () => {
    const g = inTemple();
    const ids = g.dungeon!.rooms.filter((r) => r.type === 'event').map((r) => r.eventId);
    expect(ids.length).toBe(new Set(ids).size);
    const old = repeatEvents(inTemple(), 3).dungeon!.rooms.filter((r) => r.type === 'event').map((r) => r.eventId);
    expect(old.length).toBeGreaterThan(new Set(old).size);
  });

  it('このダンジョンで起きたイベントの部屋に入ると、まだ起きていないイベントに替わる', () => {
    const g = repeatEvents(inTemple(), 1), run = g.dungeon!;
    const [a, b] = run.rooms.filter((r) => r.type === 'event' && r.eventId === run.rooms.find((x) => x.type === 'event')!.eventId);
    a.cleared = true;
    roomBehavior('event').enter(g, b, createRng(1));
    expect(b.eventId).not.toBe(a.eventId);
    expect(pool(g)).toContain(b.eventId);
    expect(g.event).toEqual({ roomId: b.id, eventId: b.eventId });
  });

  it('まだ起きていないイベントは、そのまま出る（乱数を引かない）', () => {
    const g = inTemple(), run = g.dungeon!;
    const room = run.rooms.find((r) => r.type === 'event')!;
    const rng = createRng(1), before = rng.state;
    expect(freshEventId(g, run, room, room.eventId!, rng)).toBe(room.eventId);
    expect(rng.state).toBe(before);
  });

  it('候補を全部使い切った時だけ、もう一度出る', () => {
    const g = repeatEvents(inTemple(), pool(inTemple()).length), run = g.dungeon!;
    const ids = pool(g), events = run.rooms.filter((r) => r.type === 'event');
    // 候補の全部が、片づいた部屋で起きたことにする
    ids.forEach((id, i) => { events[i].eventId = id; events[i].cleared = true; });
    const room = events[ids.length];
    room.eventId = ids[0];
    expect(freshEventId(g, run, room, ids[0], createRng(1))).toBe(ids[0]);
    // 1つ空けると、その1つが出る
    events[2].cleared = false;
    expect(freshEventId(g, run, room, ids[0], createRng(1))).toBe(ids[2]);
  });

  it('同じ種なら同じイベントに替わる（保存・オンラインでも同じ）', () => {
    const pickWith = () => {
      const g = repeatEvents(inTemple(), 1), run = g.dungeon!;
      const events = run.rooms.filter((r) => r.type === 'event' && r.eventId === run.rooms.find((x) => x.type === 'event')!.eventId);
      events[0].cleared = true;
      return freshEventId(g, run, events[1], events[1].eventId!, createRng(42));
    };
    expect(pickWith()).toBe(pickWith());
  });
});
