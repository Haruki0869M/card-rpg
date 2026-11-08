// ===== 海と船（K4 段3）のテスト =====
import { describe, expect, it } from 'vitest';
import { getScenario } from '../../data/scenarios';
import { TERRAINS } from '../../data/world';
import type { GameState } from '../../types';
import { createRng } from '../rng';
import { applyOutcome, createGame, createWorld, hexDistance, makeOutcomeCtx, moveCostOf, moveWanderers, neighbors, reachable, spawnSeaWanderer } from '../index';
import { objectiveHandler } from '../game/world/objectives';

const newWorld = (seed = 3) =>
  createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: 'P1' })) });

/** 全部のマスを見えるようにして、スタートの隣の1マスを海にする */
function withSea(g: GameState): { from: number; sea: number } {
  const w = g.world!;
  for (const t of w.tiles) t.seen = true;
  const from = w.pos[g.heroes[0].id];
  const sea = neighbors(w, from).find((n) => !w.tiles[n].f && w.tiles[n].t === 'road') ?? neighbors(w, from).find((n) => !w.tiles[n].f)!;
  w.tiles[sea].t = 'sea';
  return { from, sea };
}

describe('海と船', () => {
  it('海の地形は moveCost 0 の sea で、ほかの処理（陸の敵の出現など）では通れない地形のまま', () => {
    const t = TERRAINS.get('sea');
    expect(t.sea).toBe(true);
    expect(t.moveCost).toBe(0);
  });

  it('船が無いと海のマスへ進めず、船があると進める', () => {
    const g = newWorld();
    const { from, sea } = withSea(g);
    expect(moveCostOf(g.world!, sea)).toBe(0);
    expect(reachable(g.world!, from, 6).has(sea)).toBe(false);
    g.world!.ship = true;
    expect(moveCostOf(g.world!, sea)).toBe(1);
    expect(reachable(g.world!, from, 6).get(sea)?.cost).toBe(1);
  });

  it('船があっても、海の無い地形のコストは変わらない', () => {
    const g = newWorld();
    withSea(g);
    const before = g.world!.tiles.map((_, i) => moveCostOf(g.world!, i));
    g.world!.ship = true;
    const after = g.world!.tiles.map((_, i) => moveCostOf(g.world!, i));
    g.world!.tiles.forEach((t, i) => {
      if (!TERRAINS.get(t.t).sea) expect(after[i]).toBe(before[i]);
    });
  });

  it('「船を手に入れる」の効果でパーティの船が持てる。古い保存（ship なし）でも動く', () => {
    const g = newWorld();
    expect(g.world!.ship).toBeUndefined();
    applyOutcome(makeOutcomeCtx(g, createRng(1)), { kind: 'ship' });
    expect(g.world!.ship).toBe(true);
  });

  it('侵食の魔王には海が無く、地図も海の敵も今までどおり', () => {
    const g = newWorld();
    expect(g.world!.tiles.some((t) => TERRAINS.get(t.t).sea)).toBe(false);
    expect(spawnSeaWanderer(g, g.world!, createRng(1), 0)).toBeUndefined();
  });

  it('施設とスタートのまわりは陸にする（landAround）。海がほとんどの地図でも小さな島ができない', () => {
    const g = newWorld();
    const def = getScenario('corruptionKing').map!;
    const regs = def.regions.map((r) => ({ ...r.terrain }));
    def.regions.forEach((r) => (r.terrain = { sea: 50, plains: 1 }));
    def.landAround = 1;
    try {
      const w = createWorld(g, createRng(7));
      const near = (c: number) => w.tiles.map((_, i) => i).filter((i) => hexDistance(w, c, i) <= 1);
      const start = w.pos[g.heroes[0].id];
      for (const c of [start, ...def.features.map((f) => f.at[1] * w.width + f.at[0])]) {
        for (const i of near(c)) expect(!!TERRAINS.get(w.tiles[i].t).sea, `tile ${i}`).toBe(false);
      }
      expect(w.tiles.filter((t) => TERRAINS.get(t.t).sea).length).toBeGreaterThan(w.tiles.length / 2);
    } finally {
      def.regions.forEach((r, k) => (r.terrain = regs[k]));
      delete def.landAround;
    }
  });

  it('「話を聞くだけ」の依頼は、受けてすぐ報告できる', () => {
    const g = newWorld();
    expect(objectiveHandler({ kind: 'talk' }).canReport!(g, { kind: 'talk' } as never)).toBe(true);
  });

  it('海の敵は海のマスに出て、海のマスの中だけを動く', () => {
    const g = newWorld();
    const w = g.world!;
    // 1つの地域の行をぜんぶ海にして、海の敵の組み合わせを一時的に足す
    const reg = getScenario('corruptionKing').map!.regions[0];
    const rows = reg.rows;
    for (let i = 0; i < w.tiles.length; i++) {
      const row = Math.floor(i / w.width);
      if (row >= rows[0] && row <= rows[1] && !w.tiles[i].f) w.tiles[i].t = 'sea';
    }
    reg.seaEncounters = [['goblinScout']];
    try {
      const wd = spawnSeaWanderer(g, w, createRng(5), 0);
      expect(wd).toBeDefined();
      expect(TERRAINS.get(w.tiles[wd!.tile].t).sea).toBe(true);
      // 何度動いても海から出ない
      const rng = createRng(9);
      for (let k = 0; k < 40; k++) {
        w.worldTurn = 4 * (k + 1); // wandererMoveEvery の倍数になるように
        moveWanderers(w, rng);
        expect(TERRAINS.get(w.tiles[wd!.tile].t).sea).toBe(true);
      }
    } finally {
      delete reg.seaEncounters;
    }
  });
});
