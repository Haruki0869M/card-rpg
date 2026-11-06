// ===== 世界マップの生成（spec §8.1） =====
// シナリオで決めた骨格（地域・町・ダンジョン・名所）＋ シードによるランダム要素（地形・宝箱・イベント・祠・徘徊する敵）。
// 町・ダンジョンは道でつなぎ、ランダムに置くものはスタート地点から歩いて行ける場所にだけ置く
import { getScenario } from '../../../data/scenarios';
import { EVENTS } from '../../../data/events';
import { SHRINES, TERRAINS } from '../../../data/world';
import type { GameState, MapFeature, ScenarioMapDef, Tile, WorldState } from '../../../types';
import type { Rng } from '../../rng';
import { RARITIES } from '../dungeon';
import { pickWeighted } from '../loot';
import { hexDistance, idxOf, neighbors, rowOf } from './hex';
import { revealAround } from './fog';
import { spawnWanderer } from './wanderers';

const pick = <T,>(list: readonly T[], rng: Rng) => list[rng.int(list.length)];

/** 地図の上での単純な最短経路（地形を無視。道を引く用） */
function straightPath(w: Pick<WorldState, 'width' | 'height'>, a: number, b: number): number[] {
  const prev = new Map<number, number>([[a, -1]]);
  const q = [a];
  while (q.length) {
    const cur = q.shift()!;
    if (cur === b) break;
    for (const n of neighbors(w, cur)) if (!prev.has(n)) (prev.set(n, cur), q.push(n));
  }
  const path: number[] = [];
  for (let c = b; c >= 0; c = prev.get(c) ?? -1) path.unshift(c);
  return path;
}

/** スタートから歩いて行けるマス */
function walkable(w: WorldState, start: number): Set<number> {
  const seen = new Set([start]);
  const q = [start];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of neighbors(w, cur)) {
      if (seen.has(n) || TERRAINS.get(w.tiles[n].t).moveCost <= 0) continue;
      seen.add(n);
      q.push(n);
    }
  }
  return seen;
}

export function regionOfRow(def: ScenarioMapDef, row: number): number {
  const i = def.regions.findIndex((r) => row >= r.rows[0] && row <= r.rows[1]);
  return i < 0 ? def.regions.length - 1 : i;
}

export function createWorld(game: GameState, rng: Rng): WorldState {
  const def = getScenario(game.scenarioId).map!;
  const { width, height } = def;
  const tiles: Tile[] = [];
  for (let row = 0; row < height; row++) {
    const r = regionOfRow(def, row);
    const ids = Object.keys(def.regions[r].terrain);
    const weights = ids.map((id) => def.regions[r].terrain[id]);
    for (let col = 0; col < width; col++) tiles.push({ t: ids[pickWeighted(weights, rng)], r, seen: false });
  }
  const start = idxOf({ width }, def.start[0], def.start[1]);
  const w: WorldState = {
    width,
    height,
    tiles,
    pos: {},
    turn: '',
    acted: [],
    move: null,
    worldTurn: 1,
    corruption: 0,
    wanderers: [],
    nextWandererId: 1,
    raids: [],
    fallenTowns: [],
    savedTowns: [],
    keys: [],
    quests: [],
    visitedRegions: [],
    shops: {},
  };

  // 固定の施設と、それをつなぐ道（スタートから近い順に、つながっている施設のうち一番近いものとつなぐ）
  const fixed = def.features.map((f) => ({ f, i: idxOf(w, f.at[0], f.at[1]) }));
  const connected = [start];
  for (const { f, i } of [...fixed].sort((a, b) => hexDistance(w, start, a.i) - hexDistance(w, start, b.i))) {
    const from = connected.reduce((best, c) => (hexDistance(w, c, i) < hexDistance(w, best, i) ? c : best), connected[0]);
    for (const p of straightPath(w, from, i)) tiles[p].t = def.roadTerrain;
    connected.push(i);
    tiles[i].f = { kind: f.kind, id: f.id };
  }
  tiles[start].t = def.roadTerrain;

  // ランダムに置くもの（歩いて行けて、何も無いマス。スタートの近くは避ける）
  const ok = walkable(w, start);
  const free = (row0: number, row1: number) =>
    [...ok].filter((i) => !tiles[i].f && rowOf(w, i) >= row0 && rowOf(w, i) <= row1 && hexDistance(w, i, start) >= 2);
  const mapEvents = EVENTS.forScenario(game.scenarioId).filter((e) => e.where === 'map');
  const shrineIds = SHRINES.forScenario(game.scenarioId).map((s) => s.id);
  def.regions.forEach((reg, ri) => {
    const place = (n: number, make: () => MapFeature) => {
      for (let k = 0; k < n; k++) {
        const cands = free(reg.rows[0], reg.rows[1]);
        if (!cands.length) return;
        tiles[pick(cands, rng)].f = make();
      }
    };
    // 奥の地域ほど良い宝箱が出やすい
    const depth = def.regions.length - 1 - ri;
    place(reg.chests ?? 0, () => {
      const wts = [Math.max(20, 70 - depth * 12), 25 + depth * 4, 4 + depth * 4, 1 + depth];
      return { kind: 'chest', id: 'mapChest', chest: { rarity: RARITIES[pickWeighted(wts, rng)], locked: rng.next() < 0.3 } };
    });
    if (mapEvents.length) place(reg.events ?? 0, () => ({ kind: 'event', id: pick(mapEvents, rng).id }));
    if (shrineIds.length) place(reg.shrines ?? 0, () => ({ kind: 'shrine', id: pick(shrineIds, rng) }));
    for (const d of reg.randomDungeons ?? []) place(1, () => ({ kind: 'dungeon', id: d }));
  });

  // 徘徊する敵
  for (let ri = 0; ri < def.regions.length; ri++) for (let k = 0; k < def.regions[ri].wanderers; k++) spawnWanderer(game, w, rng, ri);

  // キャラの位置と最初の手番
  const alive = game.heroes.filter((h) => !h.retired);
  for (const h of alive) w.pos[h.id] = start;
  w.turn = alive[0]?.id ?? '';
  w.prevTile = start;
  // スタートの地域は冒頭の物語で紹介済み
  w.visitedRegions.push(tiles[start].r);
  revealAround(game, w);
  return w;
}

export { straightPath };
