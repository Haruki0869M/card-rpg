// 手番のカットイン（docs/tasks/turn-cutin.md）: 手番が移った時だけ出る。自分のキャラなら大きく、ほかの人のキャラなら小さなお知らせ
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame, WORLD_SCENE } from '../engine';
import type { GameState, PlayerId } from '../types';
import { setLocalPlayers } from './battleConfig';
import { useBattle } from './battleStore';

vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
});

function twoPlayers(): GameState {
  const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: (['P1', 'P2'] as PlayerId[]).map((playerId, i) => ({ classId: 'warrior', gender: 'male' as const, name: `仲間${i}`, playerId })) });
  g.world!.story = undefined;
  g.world!.turn = 'h0';
  return g;
}

afterEach(() => {
  setLocalPlayers(null);
  useBattle.getState().abandonGame();
});

describe('手番のカットイン', () => {
  it('1台で2人: 手番が P2 に移ると大きなカットイン。同じ手番のままの操作では出ない', () => {
    useBattle.getState().loadRemote(twoPlayers());
    expect(useBattle.getState().turnCutin).toBeNull();
    expect(useBattle.getState().dispatchWire({ type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h0', focusUsed: 0 })).toBeUndefined();
    expect(useBattle.getState().turnCutin).toBeNull();
    expect(useBattle.getState().dispatchWire({ type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' })).toBeUndefined();
    const c = useBattle.getState().turnCutin!;
    expect(c).toMatchObject({ heroId: 'h1', mine: true, scene: WORLD_SCENE });
    useBattle.getState().dismissTurnCutin(c.id);
    expect(useBattle.getState().turnCutin).toBeNull();
  });

  it('オンライン: ほかの人のキャラの番なら小さなお知らせ（mine = false）', () => {
    setLocalPlayers(['P1']);
    useBattle.getState().loadRemote(twoPlayers());
    useBattle.getState().dispatchWire({ type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' });
    expect(useBattle.getState().turnCutin).toMatchObject({ heroId: 'h1', mine: false });
  });

  it('ダンジョンの組の番が来ると、カットインはその場面を指し、画面もその場面に切り替わる', () => {
    const g = twoPlayers();
    g.world!.pos.h0 = g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'emeraldTemple');
    useBattle.getState().loadRemote(g);
    expect(useBattle.getState().dispatchWire({ type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] })).toBeUndefined();
    const exp = useBattle.getState().full!.expeditions![0].id;
    // 入った番は終わり、世界マップの h1 の番
    expect(useBattle.getState().turnCutin).toMatchObject({ heroId: 'h1', scene: WORLD_SCENE });
    useBattle.getState().setScene(WORLD_SCENE);
    expect(useBattle.getState().dispatchWire({ type: 'WORLD_WAIT', playerId: 'P2', heroId: 'h1' })).toBeUndefined();
    expect(useBattle.getState().turnCutin).toMatchObject({ heroId: 'h0', mine: true, scene: exp });
    expect(useBattle.getState().scene).toBe(exp);
  });

  it('冒険の画面を離れると消える', () => {
    useBattle.getState().loadRemote(twoPlayers());
    useBattle.getState().dispatchWire({ type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' });
    expect(useBattle.getState().turnCutin).not.toBeNull();
    useBattle.getState().setScreen('title');
    expect(useBattle.getState().turnCutin).toBeNull();
  });
});
