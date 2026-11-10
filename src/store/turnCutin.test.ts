// 手番のカットイン（docs/archive/tasks/turn-cutin.md）: 手番が移った時だけ出る。自分のキャラなら大きく、ほかの人のキャラなら小さなお知らせ
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame, WORLD_SCENE } from '../engine';
import type { GameState, PlayerId } from '../types';
import { setLocalPlayers } from './battleConfig';
import { cutinToShow, turnCutinSeconds } from '../components/ui/TurnCutin';
import { TIMING } from '../data/balance';
import { useBattle } from './battleStore';

vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
});

function twoPlayers(players: PlayerId[] = ['P1', 'P2']): GameState {
  const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((playerId, i) => ({ classId: 'warrior', gender: 'male' as const, name: `仲間${i}`, playerId })) });
  g.world!.story = undefined;
  g.world!.turn = 'h0';
  return g;
}

afterEach(() => {
  setLocalPlayers(null);
  useBattle.getState().abandonGame();
});

describe('手番のカットイン', () => {
  it('1台で担当が P1→P2 に変わる（世界マップの画面のまま）: カットインは出さず、受け渡しの画面1枚だけ（フェーズ2-C）', () => {
    useBattle.getState().loadRemote(twoPlayers());
    expect(useBattle.getState().dispatchWire({ type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' })).toBeUndefined();
    expect(useBattle.getState().full!.world!.turn).toBe('h1');
    expect(useBattle.getState().turnCutin).toBeNull();
    // P2 → P1 も同じ
    expect(useBattle.getState().dispatchWire({ type: 'WORLD_WAIT', playerId: 'P2', heroId: 'h1' })).toBeUndefined();
    expect(useBattle.getState().turnCutin).toBeNull();
  });

  it('1台で2人（担当が同じ P1）: 手番が2人目に移ると大きなカットイン。同じ手番のままの操作では出ない', () => {
    useBattle.getState().loadRemote(twoPlayers(['P1', 'P1']));
    expect(useBattle.getState().turnCutin).toBeNull();
    expect(useBattle.getState().dispatchWire({ type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h0' })).toBeUndefined();
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
    // 入った番は終わり、世界マップの h1（P2）の番。1台で世界マップの画面のまま担当が変わるので、受け渡しの画面だけ（カットインは出さない。フェーズ2-C）
    expect(useBattle.getState().turnCutin).toBeNull();
    useBattle.getState().setScene(WORLD_SCENE);
    expect(useBattle.getState().dispatchWire({ type: 'WORLD_WAIT', playerId: 'P2', heroId: 'h1' })).toBeUndefined();
    expect(useBattle.getState().turnCutin).toMatchObject({ heroId: 'h0', mine: true, scene: exp });
    expect(useBattle.getState().scene).toBe(exp);
  });

  it('物語を読んでいる間は、帯を出さずに後回しにする（物語を閉じると出る）。手番の状態は変わらない', () => {
    useBattle.getState().loadRemote(twoPlayers(['P1', 'P1']));
    useBattle.getState().dispatchWire({ type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' });
    const c = useBattle.getState().turnCutin!;
    expect(c).not.toBeNull();
    // 物語が出ている間: 帯は出さない（カットインの状態は消えずに残る）
    expect(cutinToShow(c, true)).toBeNull();
    expect(useBattle.getState().turnCutin).toBe(c);
    // 物語を閉じたら、同じ帯が出る
    expect(cutinToShow(c, false)).toBe(c);
  });

  it('冒険の画面を離れると消える', () => {
    useBattle.getState().loadRemote(twoPlayers(['P1', 'P1']));
    useBattle.getState().dispatchWire({ type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' });
    expect(useBattle.getState().turnCutin).not.toBeNull();
    useBattle.getState().setScreen('title');
    expect(useBattle.getState().turnCutin).toBeNull();
  });
});

describe('手番の帯の長さ（ステップB）', () => {
  const solo = [{ playerId: 'P1' as const }, { playerId: 'P1' as const }];
  const pass = [{ playerId: 'P1' as const }, { playerId: 'P2' as const }];
  it('1人で全員を操作する時の世界マップは短く（約0.5秒）', () => {
    expect(turnCutinSeconds({ mine: true, short: false, online: false, world: true, players: solo })).toBe(TIMING.turnCutinSolo);
    expect(TIMING.turnCutinSolo).toBe(0.5);
  });
  it('1台を回す時・オンライン・ダンジョンの番は今までどおり。簡易・高速・動作軽減も今までどおり', () => {
    expect(turnCutinSeconds({ mine: true, short: false, online: false, world: true, players: pass })).toBe(TIMING.turnCutin);
    expect(turnCutinSeconds({ mine: true, short: false, online: true, world: true, players: solo })).toBe(TIMING.turnCutin);
    expect(turnCutinSeconds({ mine: true, short: false, online: false, world: false, players: solo })).toBe(TIMING.turnCutin);
    expect(turnCutinSeconds({ mine: true, short: true, online: false, world: true, players: pass })).toBe(TIMING.turnCutinShort);
    expect(turnCutinSeconds({ mine: true, short: true, online: false, world: true, players: solo })).toBe(Math.min(TIMING.turnCutinShort, TIMING.turnCutinSolo));
    expect(turnCutinSeconds({ mine: false, short: false, online: true, world: true, players: pass })).toBe(TIMING.turnNotice);
  });
});
