import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyCommand, applyGameCommand, createBattle, createGame, WORLD_SCENE } from '../engine';
import type { GameCommand, GameState } from '../types';
import { useBattle } from './battleStore';

// ブラウザーの保存先を再現し、演出待ちが保存に混ざらないことも確かめる。
const storage = vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
  return values;
});

function fresh() {
  const g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', name: '確認', gender: 'male', playerId: 'P1' }] });
  g.world!.story = undefined; g.world!.pos.h0 = 0; g.world!.move = 6;
  g.world!.tiles.forEach(t => { t.t = 'road'; t.f = undefined; t.seen = true; });
  g.world!.visitedRegions = Array.from({ length: 100 }, (_, i) => i);
  g.heroes[0].lastRandomEvent = g.world!.worldTurn;
  return g;
}
const move: GameCommand = { type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to: 4, companions: [] };
afterEach(() => { useBattle.getState().abandonGame(); vi.useRealTimers(); });
describe('移動結果と表示待ちの分離', () => {
  it('敵マスに着くまでの経路を保持し、表示待ち中も遭遇結果を保存できる', () => {
    vi.useFakeTimers(); const g = fresh(); g.world!.wanderers[0].tile = 2; g.world!.wanderers = [g.world!.wanderers[0]];
    useBattle.getState().loadRemote(g);
    expect(useBattle.getState().dispatchWire({ ...move, to: 2 })).toBeUndefined();
    const s = useBattle.getState(); expect(s.full!.mode).toBe('encounter'); expect(s.full!.battle).toBeUndefined();
    expect(s.worldMoves).toHaveLength(1); expect(s.worldMoves[0].game.world!.lastMove!.path).toEqual([0, 1, 2]);
    expect(s.full!.world!.pos.h0).toBe(2); expect(s.worldMoves[0].game).toBe(s.full);
    const before = s.full;
    vi.advanceTimersByTime(160);
    const saved = JSON.parse(storage.get('card-rpg/adventure')!);
    expect(saved.game.mode).toBe('encounter'); expect(saved.game.world.pos.h0).toBe(2);
    expect(saved.worldMoves).toBeUndefined(); expect(saved.game.worldMoves).toBeUndefined();
    expect(useBattle.getState().worldMoves).toHaveLength(1);
    expect(s.dispatchWire({ type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0'] })).toContain('移動');
    expect(useBattle.getState().full).toBe(before);
    s.finishWorldMove(s.worldMoves[0].id);
    expect(useBattle.getState().worldMoves).toHaveLength(0); expect(useBattle.getState().full).toBe(before);
    expect(useBattle.getState().full!.mode).toBe('encounter');
  });
  it('通常移動と施設到着でも経路を保持し、二重移動を拒否する', () => {
    vi.useFakeTimers(); const g = fresh(); g.world!.wanderers = []; g.world!.tiles[4].f = { kind: 'temple', id: 'pilgrimTemple' };
    useBattle.getState().loadRemote(g); expect(useBattle.getState().dispatchWire(move)).toBeUndefined();
    const s = useBattle.getState(); expect(s.full!.mode).toBe('world'); expect(s.worldMoves[0].game.world!.lastMove!.path).toEqual([0, 1, 2, 3, 4]);
    expect(s.dispatchWire({ type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' })).toContain('移動');
    expect(s.dispatchWire(move)).toContain('移動');
    s.finishWorldMove(s.worldMoves[0].id); expect(useBattle.getState().dispatchWire({ type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' })).toBeUndefined();
    expect(useBattle.getState().full!.mode).toBe('sanctuary');
  });
  it('受信中の次の結果を保持し、表示を終えた後も最新状態を戻さない', () => {
    vi.useFakeTimers(); const g = fresh(); g.world!.wanderers = [];
    useBattle.getState().loadRemote(g);
    const r = applyGameCommand(g, move); expect(r.error).toBeUndefined(); useBattle.getState().applyRemote(r, move);
    const pending = useBattle.getState().worldMoves[0];
    const next = structuredClone(r.state); next.heroes[0].focus = 1;
    useBattle.getState().applyRemote({ state: next, battleEvents: [] }, { type: 'PET_PAT', playerId: 'P1', heroId: 'h0' });
    expect(useBattle.getState().worldMoves).toEqual([pending]); expect(useBattle.getState().full).toBe(next);
    useBattle.getState().finishWorldMove(pending.id); expect(useBattle.getState().full).toBe(next);
  });
  it('連続受信した移動は順に再生し、古い完了通知で次を消さない', () => {
    vi.useFakeTimers(); const g = fresh(); g.world!.wanderers = []; useBattle.getState().loadRemote(g);
    const a = applyGameCommand(g, move); useBattle.getState().applyRemote(a, move);
    const next = structuredClone(a.state); next.world!.lastMove = { seq: 2, heroes: ['h0'], path: [4, 5] }; next.world!.pos.h0 = 5;
    useBattle.getState().applyRemote({ state: next, battleEvents: [] }, move);
    const [first, second] = useBattle.getState().worldMoves; expect(second).toBeDefined();
    useBattle.getState().finishWorldMove(first.id); useBattle.getState().finishWorldMove(first.id);
    expect(useBattle.getState().worldMoves).toEqual([second]);
  });
  it('遅い端末の移動中に戦闘開始を受信しても、表示完了後に敵フェーズが進む', () => {
    vi.useFakeTimers(); const g = fresh(); g.world!.wanderers = []; useBattle.getState().loadRemote(g);
    const r = applyGameCommand(g, move); useBattle.getState().applyRemote(r, move);
    const next = structuredClone(r.state); next.mode = 'battle'; next.party = ['h0'];
    const b = createBattle({ seed: 7, party: [{ classId: 'warrior', name: '確認', gender: 'male', playerId: 'P1' }], encounter: { id: '確認', name: '確認', enemies: [{ defId: 'forestWolf' }] } });
    next.battle = applyCommand(b, { type: 'END_TURN', playerId: 'P1' }).state;
    expect(next.battle.phase).toBe('enemy');
    useBattle.getState().applyRemote({ state: next, battleEvents: [] }, { type: 'BATTLE', command: { type: 'ENEMY_STEP' } });
    vi.advanceTimersByTime(400); expect(useBattle.getState().full!.battle!.phase).toBe('enemy');
    const pending = useBattle.getState().worldMoves[0]; useBattle.getState().finishWorldMove(pending.id);
    // 「敵のターン」の帯（1秒）→ 敵の間（0.4秒）→ 敵の行動の演出 の後に進む
    vi.advanceTimersByTime(3000); expect(useBattle.getState().full!.battle!.phase).toBe('ally');
  });
  it('再接続では過去の移動を再生せず、完了待ちを破棄して最新場面へ移る', () => {
    vi.useFakeTimers(); const g = fresh(); g.world!.wanderers = []; useBattle.getState().loadRemote(g);
    useBattle.getState().dispatchWire(move); expect(useBattle.getState().worldMoves).toHaveLength(1);
    const latest = structuredClone(useBattle.getState().full!) as GameState;
    useBattle.getState().loadRemote(latest); expect(useBattle.getState().worldMoves).toHaveLength(0);
    expect(useBattle.getState().scene).toBe(WORLD_SCENE); expect(useBattle.getState().full).toBe(latest);
  });
});
