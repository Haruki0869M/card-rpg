// フェーズ2-C: 1台で遊ぶ時の手番の受け渡し・同行の確認の省略
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame, reachable } from '../engine';
import type { GameState, PlayerId } from '../types';
import { autoAgreeCommands } from '../components/world/companionMove';
import { isLocalPlayer, setLocalPlayers } from './battleConfig';
import { handoffReplacesCutin } from './handoff';
import { useBattle } from './battleStore';

vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
});

afterEach(() => {
  setLocalPlayers(null);
  useBattle.getState().abandonGame();
});

describe('受け渡しの画面がカットインの代わりになる時', () => {
  const base = { online: false, worldBefore: true, worldAfter: true, prevPlayer: 'P1' as PlayerId, nextPlayer: 'P2' as PlayerId, players: 2 };
  it('1台・世界マップのまま・担当が変わる時だけ', () => {
    expect(handoffReplacesCutin(base)).toBe(true);
    expect(handoffReplacesCutin({ ...base, online: true })).toBe(false);
    expect(handoffReplacesCutin({ ...base, worldBefore: false })).toBe(false);
    expect(handoffReplacesCutin({ ...base, worldAfter: false })).toBe(false);
    expect(handoffReplacesCutin({ ...base, nextPlayer: 'P1' })).toBe(false);
    expect(handoffReplacesCutin({ ...base, players: 1 })).toBe(false);
  });
});

/** n人（P1〜Pn）が同じマスにいて、P2（h1）の番。P2 がほかの全員を誘って承知してもらった所（移動力3） */
function invitedByP2(n: number): { g: GameState; start: number } {
  const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: (['P1', 'P2', 'P3', 'P4'] as PlayerId[]).slice(0, n).map((playerId, i) => ({ playerId, classId: 'warrior', gender: 'male' as const, name: `仲間${i}` })) });
  const w = g.world!;
  w.story = undefined;
  const start = w.pos.h0;
  for (const h of g.heroes) { w.pos[h.id] = start; h.lastRandomEvent = w.worldTurn; }
  w.turn = 'h1';
  w.acted = ['h0'];
  w.move = 3;
  return { g, start };
}

describe('1台で遊ぶ時、同行の「一緒に行く」の確認を省く（フェーズ2-C）', () => {
  for (const n of [2, 3, 4]) {
    it(`${n}人: P2 の番に全員を連れて動くと、確認なしで全員が同じマスへ着く`, () => {
      const { g, start } = invitedByP2(n);
      useBattle.getState().loadRemote(g);
      const st = () => useBattle.getState();
      for (const c of g.heroes.filter((h) => h.id !== 'h1')) {
        expect(st().dispatchGame({ type: 'WORLD_INVITE', playerId: 'P2', heroId: 'h1', targetId: c.id })).toBeUndefined();
        expect(st().dispatchGame({ type: 'WORLD_INVITE_ANSWER', playerId: c.playerId, heroId: c.id, accept: true })).toBeUndefined();
      }
      const to = [...reachable(st().full!.world!, start, 3).keys()].find((t) => t !== start)!;
      const companions = g.heroes.filter((h) => h.id !== 'h1').map((h) => h.id);
      expect(st().dispatchGame({ type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h1', to, companions })).toBeUndefined();
      // 担当の違う仲間がいるので、エンジンは提案を作る → 画面は確認を出さずに、この端末の担当全員の返事を送る
      expect(st().full!.world!.moveProposal).toBeDefined();
      const cmds = autoAgreeCommands(st().game!, isLocalPlayer);
      expect(cmds.length).toBe(n - 1);
      for (const c of cmds) expect(st().dispatchGame(c)).toBeUndefined();
      const w = st().full!.world!;
      expect(w.moveProposal).toBeUndefined();
      for (const h of g.heroes) expect(w.pos[h.id]).toBe(to);
    });
  }
  it('オンライン（この端末は P2 だけ）: ほかの人の返事は送らない（同意を取る）', () => {
    const { g } = invitedByP2(2);
    g.world!.moveProposal = { heroId: 'h1', to: 0, companions: ['h0'], owners: ['P1'], agreed: [] };
    setLocalPlayers(['P2']);
    expect(autoAgreeCommands(g, isLocalPlayer)).toEqual([]);
  });
});
