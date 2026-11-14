// ===== 3つの道（2026-11-14・docs/tasks/three-roads-plan.md。宿題1・オーナーの返事 2A）=====
// 街道 = 速いが敵が多い・西の森 = 安全で回復・東の丘 = 危ないが宝。地図の生成で差が保たれる・敵が帯をまたがない・夜襲の倍率・
// 古い保存（地図を作り直さない）・保存再開とオンライン（同じ操作で同じ結果）
import { describe, expect, it } from 'vitest';
import { getScenario } from '../../data/scenarios';
import { BALANCE } from '../../data/balance';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, createGame, createRng, migrateGame, validateGame } from '../index';
import { botNextCommand } from '../bot';
import { laneDefOfTile, laneOfTile } from '../game/world/lanes';
import { moveWanderers, spawnWanderer, wandererLevel } from '../game/world/wanderers';
import { campAmbushChance } from '../game/world/world';
import { RARITIES } from '../game/dungeon';

const def = getScenario('corruptionKing').map!;
function newGame(seed: number, players: PlayerId[] = ['P1']): GameState {
  return createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((playerId, i) => ({ classId: ['warrior', 'priest'][i % 2], gender: 'male' as const, name: `h${i}`, playerId })) });
}
const SEEDS = Array.from({ length: 30 }, (_, k) => 3001 + k);
/** 帯ごとの「敵が湧けるマス」（地域の中の陸で、施設の無いマス）の数 */
function landTiles(g: GameState, lane: string) {
  const w = g.world!;
  return w.tiles.filter((t, i) => laneOfTile(g, w, i) === lane && !t.f).length;
}

describe('3つの道: 地図の生成', () => {
  it('帯のデータ（印・説明・重み）がそろっている', () => {
    const by = Object.fromEntries(def.lanes!.map((l) => [l.id, l]));
    expect(by.center.spawnWeight).toBeGreaterThan(by.east.spawnWeight ?? 1);
    expect(by.west.spawnWeight).toBeLessThan(1);
    expect(by.east.enemyLevel).toBeGreaterThan(0);
    expect(by.west.ambush).toBeLessThan(1);
    expect(by.east.ambush).toBeGreaterThan(1);
    expect(def.prefer?.chest).toBe('east');
    for (const l of def.lanes!) expect(l.mark && l.hint).toBeTruthy();
  });

  it('街道の帯は敵が多く、西の森は少ない（マスの広さあたり）。敵の総数は地域の数のまま', () => {
    const per: Record<string, number> = { west: 0, center: 0, east: 0 };
    const area: Record<string, number> = { west: 0, center: 0, east: 0 };
    for (const s of SEEDS) {
      const g = newGame(s);
      const w = g.world!;
      expect(w.wanderers.length).toBe(def.regions.reduce((n, r) => n + r.wanderers, 0));
      for (const wd of w.wanderers) per[laneOfTile(g, w, wd.tile)!]++;
      for (const k of Object.keys(area)) area[k] += landTiles(g, k);
    }
    const dens = (k: string) => per[k] / area[k];
    expect(dens('center')).toBeGreaterThan(dens('east') * 1.5);
    expect(dens('east')).toBeGreaterThan(dens('west') * 1.5);
  });

  it('東の丘の敵は、地域のレベル +1（ほかの帯は地域のまま）', () => {
    for (const s of SEEDS.slice(0, 8)) {
      const g = newGame(s);
      const w = g.world!;
      for (const wd of w.wanderers) {
        const add = laneDefOfTile(g, w, wd.tile)?.enemyLevel ?? 0;
        expect(wd.enemies[0].level).toBe(wandererLevel(g, w, w.tiles[wd.tile].r) + add);
      }
    }
  });

  it('宝箱は東の丘に多く、東の宝箱は良い（盆地・半島の分を除いても）', () => {
    const n: Record<string, number> = { west: 0, center: 0, east: 0 };
    const good: Record<string, number> = { west: 0, center: 0, east: 0 };
    const pockets = new Set(def.pockets!.map((p) => p.at[1] * def.width + p.at[0]));
    for (const s of SEEDS) {
      const g = newGame(s);
      const w = g.world!;
      w.tiles.forEach((t, i) => {
        if (t.f?.kind !== 'chest' || pockets.has(i)) return;
        const lane = laneOfTile(g, w, i)!;
        n[lane]++;
        if (RARITIES.indexOf(t.f.chest!.rarity) >= 2) good[lane]++;
      });
    }
    expect(n.east).toBeGreaterThan(n.west * 2);
    expect(n.east).toBeGreaterThan(n.center * 2);
    expect(good.east / n.east).toBeGreaterThan(good.west / Math.max(1, n.west) + 0.05);
  });

  it('西の森に祠と薬草（回復の場所）が多い', () => {
    let west = 0, other = 0;
    for (const s of SEEDS.slice(0, 10)) {
      const g = newGame(s);
      const w = g.world!;
      w.tiles.forEach((t, i) => {
        if (t.f?.kind !== 'shrine' && t.f?.id !== 'herbField') return;
        if (laneOfTile(g, w, i) === 'west') west++;
        else other++;
      });
    }
    expect(west).toBeGreaterThan(other);
  });
});

describe('3つの道: 遊んでいる間', () => {
  it('徘徊する敵は帯をまたいで動かない（広い地図）', () => {
    const g = newGame(3005);
    const w = structuredClone(g.world!);
    const lane0 = new Map(w.wanderers.map((x) => [x.id, laneOfTile(g, w, x.tile)]));
    const rng = createRng(77);
    let moved = 0;
    for (let t = 0; t < 200; t++) {
      w.worldTurn++;
      const before = w.wanderers.map((x) => x.tile).join();
      moveWanderers(w, rng, g);
      if (w.wanderers.map((x) => x.tile).join() !== before) moved++;
      for (const x of w.wanderers) expect(laneOfTile(g, w, x.tile)).toBe(lane0.get(x.id));
    }
    expect(moved).toBeGreaterThan(20);
  });

  it('夜の野営の夜襲: 西の森は半分・東の丘は1.5倍（街道は今のまま）', () => {
    const g = structuredClone(newGame(3002));
    const w = g.world!;
    const h = g.heroes[0];
    // 夜のワールドターンを探す
    while (campAmbushChance(g, h.id) === 0 && w.worldTurn < 100) w.worldTurn++;
    const at = (lane: string) => w.tiles.findIndex((t, i) => laneOfTile(g, w, i) === lane && !t.f);
    w.pos[h.id] = at('center');
    const base = campAmbushChance(g, h.id);
    expect(base).toBe(BALANCE.nightAmbushChance);
    w.pos[h.id] = at('west');
    expect(campAmbushChance(g, h.id)).toBe(Math.round(base * 0.5));
    w.pos[h.id] = at('east');
    expect(campAmbushChance(g, h.id)).toBe(Math.min(100, Math.round(base * 1.5)));
  });

  it('前の幅の地図（古い 8×35 の保存）は、帯を使わない（重み・レベル・夜襲・動き）', () => {
    const g = structuredClone(newGame(3003));
    const w = g.world!;
    // 前の幅の地図に見立てる（地図は作り直さない。大きさがデータと違うと広い地図ではない）
    w.width = 8;
    w.height = 35;
    w.tiles = w.tiles.filter((_, i) => i % 15 < 8).slice(0, 8 * 35);
    w.wanderers = [];
    for (const id of Object.keys(w.pos)) w.pos[id] = 8 * 34 + 3;
    expect(laneDefOfTile(g, w, 0)).toBeUndefined();
    const rng = createRng(5);
    const wd = spawnWanderer(g, w, rng, 2)!;
    expect(wd.enemies[0].level).toBe(wandererLevel(g, w, 2));
    while (campAmbushChance(g, g.heroes[0].id) === 0 && w.worldTurn < 100) w.worldTurn++;
    expect(campAmbushChance(g, g.heroes[0].id)).toBe(BALANCE.nightAmbushChance);
  });

  it('今の広い地図の保存は、地図を作り直さずにそのまま読める', () => {
    const g = newGame(3004);
    const m = migrateGame(JSON.parse(JSON.stringify(g)))!;
    expect(validateGame(m)).toBe(true);
    expect(JSON.stringify(m.world!.tiles)).toBe(JSON.stringify(g.world!.tiles));
    expect(JSON.stringify(m.world!.wanderers)).toBe(JSON.stringify(g.world!.wanderers));
  });

  it('同じ操作なら同じ結果（オンラインの各端末・保存して再開しても）', () => {
    const g0 = newGame(3006, ['P1', 'P2']);
    const cmds: GameCommand[] = [];
    let g = g0;
    const memo = { interacted: new Set<string>() };
    for (let k = 0; k < 400; k++) {
      const c = botNextCommand(g, memo);
      if (!c) break;
      const r = applyGameCommand(g, c);
      if (r.error) break;
      cmds.push(c);
      g = r.state;
    }
    expect(cmds.filter((c) => c.type === 'WORLD_MOVE').length).toBeGreaterThan(5);
    // もう1台（JSON で受け取った最初の状態から）・途中で保存して再開
    let h = JSON.parse(JSON.stringify(g0)) as GameState;
    cmds.forEach((c, k) => {
      if (k === Math.floor(cmds.length / 2)) h = migrateGame(JSON.parse(JSON.stringify(h)))!;
      h = applyGameCommand(h, c).state;
    });
    expect(JSON.stringify(h.world)).toBe(JSON.stringify(g.world));
  });
});
