// 第3段階B2: 扉が開く演出の待ち。扉を開けて部屋に入ると、演出が終わるまで部屋の画面への切り替えを待つ（状態はもう進んでいる）
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame } from '../engine';
import type { GameState } from '../types';
import { useBattle } from './battleStore';

vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
});

function inTemple(): { g: GameState } {
  const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: '確認', playerId: 'P1' }] });
  g.world!.story = undefined;
  g.world!.turn = 'h0';
  g.world!.pos.h0 = g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'emeraldTemple');
  return { g };
}

afterEach(() => useBattle.getState().abandonGame());

describe('扉が開く演出の待ち', () => {
  it('扉を開けると、部屋に入る前の様子を持って待つ。状態はもう戦闘。終えると消える', () => {
    useBattle.getState().loadRemote(inTemple().g);
    const s = useBattle.getState();
    expect(s.dispatchWire({ type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] })).toBeUndefined();
    const x = useBattle.getState().scene;
    expect(useBattle.getState().doorOpen).toBeNull();
    expect(useBattle.getState().dispatchGame({ type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' })).toBeUndefined();
    const d = useBattle.getState().doorOpen!;
    expect(d.scene).toBe(x);
    expect(d.run.currentRoomId).toBeUndefined();
    expect(useBattle.getState().game!.mode).toBe('battle');
    useBattle.getState().finishDoorOpen(d.id);
    expect(useBattle.getState().doorOpen).toBeNull();
  });

  it('歩くだけ・向きを変えるだけでは出ない。場面を切り替えると捨てる', () => {
    useBattle.getState().loadRemote(inTemple().g);
    useBattle.getState().dispatchWire({ type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] });
    useBattle.getState().dispatchGame({ type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'back' });
    expect(useBattle.getState().doorOpen).toBeNull();
    useBattle.getState().dispatchGame({ type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'back' });
    useBattle.getState().dispatchGame({ type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' });
    expect(useBattle.getState().doorOpen).not.toBeNull();
    useBattle.getState().setScene('world');
    expect(useBattle.getState().doorOpen).toBeNull();
  });
});
