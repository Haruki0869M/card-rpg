import { BALANCE } from '../../../data/balance';
import { getScenario } from '../../../data/scenarios';
import { SANCTUARIES, TERRAINS } from '../../../data/world';
import type { GameState, WorldState } from '../../../types';
import { neighbors, rowOf } from './hex';
import { startTileOf } from './start';

/** 旧10祭壇を5つの共用祭壇へ統合する。滞在中なら、そのマスを優先して残す。 */
export function consolidateSanctuaries(game: GameState) {
  const w = game.world;
  if (!w) return;
  for (const def of SANCTUARIES.forScenario(game.scenarioId)) {
    if (def.kind !== 'altar') continue;
    const ids = [def.id, ...(def.legacyIds ?? [])];
    const tiles = w.tiles.flatMap((t, i) => t.f?.kind === 'altar' && ids.includes(t.f.id) ? [i] : []);
    if (!tiles.length) continue;
    const visit = game.sanctuary;
    const staying = visit && tiles.includes(visit.tile);
    const canonical = tiles.find(i => w.tiles[i].f!.id === def.id);
    const keep = staying ? visit.tile : (canonical !== undefined && w.tiles[canonical].seen ? canonical : tiles.find(i => w.tiles[i].seen) ?? canonical ?? tiles[0]);
    // 地形・マス番号・霧は変えず、施設だけを整理する。
    for (const tile of tiles) if (tile !== keep) delete w.tiles[tile].f;
    w.tiles[keep].f = { kind: 'altar', id: def.id };
    if (staying) visit.sanctuaryId = def.id;
  }
}

/** 新規・旧保存に共通の施設配置。地形・既存施設・位置・乱数には触れない。 */
export function addSanctuaries(game: GameState, w: WorldState): string[] {
  const map = getScenario(game.scenarioId).map;
  if (!map) return [];
  const start = startTileOf(game, w);
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
