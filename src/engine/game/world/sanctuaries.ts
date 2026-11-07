import { BALANCE } from '../../../data/balance';
import { getScenario } from '../../../data/scenarios';
import { SANCTUARIES, TERRAINS } from '../../../data/world';
import type { GameState, WorldState } from '../../../types';
import { idxOf, neighbors, rowOf } from './hex';

/** 新規・旧保存に共通の施設配置。地形・既存施設・位置・乱数には触れない。 */
export function addSanctuaries(game: GameState, w: WorldState): string[] {
  const map = getScenario(game.scenarioId).map;
  if (!map) return [];
  const start = idxOf(w, map.start[0], map.start[1]);
  const reachable = new Set<number>([start]);
  const queue = [start];
  for (let k = 0; k < queue.length; k++) for (const n of neighbors(w, queue[k])) {
    if (!reachable.has(n) && TERRAINS.get(w.tiles[n].t).moveCost > 0) { reachable.add(n); queue.push(n); }
  }
  // 歩ける経路で道まで何マスか。直線距離では水・山を越えてしまうため使わない。
  const distance = new Map<number, number>();
  const roads = [...reachable].filter(i => w.tiles[i].t === map.roadTerrain);
  for (const i of roads) distance.set(i, 0);
  for (let k = 0; k < roads.length; k++) {
    const cur = roads[k], d = distance.get(cur)!;
    if (d >= BALANCE.sanctuaryRoadDistance) continue;
    for (const n of neighbors(w, cur)) if (reachable.has(n) && !distance.has(n)) { distance.set(n, d + 1); roads.push(n); }
  }
  const occupied = new Set([
    ...Object.values(w.pos), ...Object.values(w.downed ?? {}), ...w.wanderers.map(e => e.tile),
    game.event?.tile, game.chest?.tile, game.shrine?.tile, game.encounter?.tile, game.sanctuary?.tile,
  ]);
  const missing: string[] = [];
  for (const def of SANCTUARIES.forScenario(game.scenarioId)) {
    if (w.tiles.some(t => t.f?.kind === def.kind && t.f.id === def.id)) continue;
    const targetRow = (w.height - 1) * (1 - def.progress);
    const candidates = [...distance.keys()].filter(i => !w.tiles[i].f && !occupied.has(i));
    candidates.sort((a, b) => Math.abs(rowOf(w, a) - targetRow) - Math.abs(rowOf(w, b) - targetRow)
      || distance.get(a)! - distance.get(b)! || a - b);
    const tile = candidates[0];
    if (tile === undefined) { missing.push(def.id); continue; }
    w.tiles[tile].f = { kind: def.kind, id: def.id };
  }
  return missing;
}
