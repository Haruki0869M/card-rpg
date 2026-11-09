// ===== 冒険の長さ・転職の速さの見直し（docs/tasks/play-feedback-plan.md §4・§5） =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { SCENARIOS } from '../../data/scenarios';
import { reachable } from '../game/world/hex';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, createGame } from '../index';

const P: PlayerId = 'P1';
const newWorld = (classes = ['warrior', 'mage']) =>
  createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: P })) });
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
/** 敵も施設も無い、一番安く行けるマス */
function cheapStep(g: GameState, heroId: string): number {
  const w = g.world!;
  const reach = reachable(w, w.pos[heroId], w.move!);
  const free = [...reach].filter(([i, v]) => i !== w.pos[heroId] && v.cost <= w.move! && !w.wanderers.some((x) => x.tile === i) && !w.tiles[i].f);
  free.sort((a, b) => a[1].cost - b[1].cost);
  return free[0][0];
}
/** 移動の後の突発イベントは、この確認では閉じておく（侵食度には関係しない） */
const calm = (g: GameState) => {
  if (g.mode === 'event') {
    g.mode = 'world';
    g.event = undefined;
  }
  return g;
};

describe('交代運転には時間がかかる（§4 A）', () => {
  it('前の人の番で動いたキャラを、別の人の番でまた動かすと侵食度+1。1手番に1回まで。次のワールドターンで数え直す', () => {
    let g = run(newWorld(), { type: 'STORY_CONTINUE', playerId: P });
    const c0 = g.world!.corruption;
    // h0 の番: h1 を連れて動く（初めて動くので上がらない）
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0', focusUsed: 2 });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to: cheapStep(g, 'h0'), companions: ['h1'] }));
    expect(g.world!.corruption).toBe(c0);
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h0' });
    expect(g.world!.turn).toBe('h1');
    // h1 の番: h0 を連れてまた動く → 交代運転
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h1', focusUsed: 2 });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h1', to: cheapStep(g, 'h1'), companions: ['h0'] }));
    expect(g.world!.corruption).toBe(c0 + BALANCE.corruptionPerRelayMove);
    expect(g.log.some((l) => l.text.includes('交代で先へ進んだ'))).toBe(true);
    // 同じ番でもう一度動いても、上がるのは1回まで
    if (g.world!.move! > 0 && g.mode === 'world') {
      g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h1', to: cheapStep(g, 'h1'), companions: ['h0'] }));
      expect(g.world!.corruption).toBe(c0 + BALANCE.corruptionPerRelayMove);
    }
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    expect(g.world!.worldTurn).toBe(2);
    expect(g.world!.movedBy).toBeUndefined();
    const c1 = g.world!.corruption;
    expect(c1).toBe(c0 + BALANCE.corruptionPerRelayMove + BALANCE.corruptionPerTurn);
    // 次のワールドターン: 最初に動く人は上がらない
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0', focusUsed: 2 });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to: cheapStep(g, 'h0'), companions: [] }));
    expect(g.world!.corruption).toBe(c1);
  });

  it('別々に動くだけ（同じキャラを2回動かさない）なら上がらない', () => {
    let g = run(newWorld(), { type: 'STORY_CONTINUE', playerId: P });
    const c0 = g.world!.corruption;
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0', focusUsed: 2 });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to: cheapStep(g, 'h0'), companions: [] }));
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h0' });
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h1', focusUsed: 2 });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h1', to: cheapStep(g, 'h1'), companions: [] }));
    expect(g.world!.corruption).toBe(c0);
  });
});

describe('鍵のダンジョン（§4 B・C）', () => {
  it.each(SCENARIOS.all.map((s) => [s.id] as const))('%s: 2つ目の鍵のダンジョンは1つ目の鍵が要る。3つ目は要らない。制覇の侵食度は共通の値', (sid) => {
    const keyed = DUNGEONS.forScenario(sid).filter((d) => d.rewardKey && !d.random).sort((a, b) => a.baseLevel - b.baseLevel);
    expect(keyed).toHaveLength(3);
    expect(keyed[0].requiresKeys ?? []).toEqual([]);
    expect(keyed[1].requiresKeys).toEqual([keyed[0].rewardKey]);
    expect(keyed[2].requiresKeys ?? []).toEqual([]);
    for (const d of keyed) expect(d.corruptionOnClear, d.id).toBeUndefined();
    expect(BALANCE.corruptionOnKeyDungeonClear).toBe(2);
  });

  it('鍵が無いと扉が開かず、どこで鍵が手に入るかを伝える。鍵があれば入れる', () => {
    let g = run(newWorld(['warrior']), { type: 'STORY_CONTINUE', playerId: P });
    const w = g.world!;
    const tile = w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'silentCatacomb');
    w.pos.h0 = tile;
    const r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    expect(r.error).toContain('扉が開かない');
    expect(r.error).toContain(DUNGEONS.get('emeraldTemple').name);
    g.world!.keys.push('emerald');
    const before = g.world!.corruption;
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    // 入った（1人なので、そのままワールドターンも進む）
    expect(g.world!.corruption).toBeGreaterThanOrEqual(before + BALANCE.corruptionOnDungeonEnter);
    expect([g.dungeon, ...(g.expeditions ?? []).map((e) => e.dungeon)].some((d) => d?.dungeonId === 'silentCatacomb')).toBe(true);
  });
});

describe('転職の速さ（§5）', () => {
  it('転職できるレベルは 中位6・最上位7・特殊5', () => {
    expect(BALANCE.jobChange).toEqual({ base: 6, mid: 7, special: 5 });
  });
  it('中位に転職すると記録を数え直す（最上位・特殊職の条件は、中位になってからの数）', () => {
    let g = run(newWorld(['warrior']), { type: 'STORY_CONTINUE', playerId: P });
    const h = g.heroes[0];
    h.level = BALANCE.jobChange.base;
    h.feats = { perfects: 30, kills: 20 };
    g = run(g, { type: 'CHANGE_JOB', playerId: P, heroId: h.id, jobId: 'swordmaster' });
    expect(g.heroes[0].feats).toEqual({});
  });
});
