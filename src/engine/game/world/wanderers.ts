// ===== 徘徊する敵（spec §8.4・§8.5）: マップ上に姿が見えている敵 =====
import { BALANCE } from '../../../data/balance';
import { getDifficulty } from '../../../data/rules';
import { getScenario } from '../../../data/scenarios';
import { TERRAINS } from '../../../data/world';
import type { GameState, Wanderer, WorldState } from '../../../types';
import type { Rng } from '../../rng';
import { hexDistance, neighbors, rowOf } from './hex';
import { timeOfDay } from './time';

/** 侵食度の段階による敵のレベルの加算 */
export function corruptionLevelBonus(game: GameState, w: WorldState): number {
  const stages = getScenario(game.scenarioId).map?.corruptionStages ?? [];
  return stages.filter((s) => w.corruption >= s.at).reduce((n, s) => n + (s.enemyLevel ?? 0), 0);
}

/** 敵のレベル: 地域の基準 + 難易度 + 侵食度の段階 + 夜 */
export function wandererLevel(game: GameState, w: WorldState, region: number): number {
  const def = getScenario(game.scenarioId).map!;
  const night = timeOfDay(w.worldTurn) === 'night' ? BALANCE.nightEnemyLevel : 0;
  return Math.max(1, def.regions[region].enemyLevel + getDifficulty(game.difficulty).enemyLevel + corruptionLevelBonus(game, w) + night);
}

/** 敵やキャラ・施設のあるマス、または敵が入れない地形。海の敵（sea）は海のマスにだけ入る */
const blocked = (w: WorldState, i: number, sea = false) => {
  const t = TERRAINS.get(w.tiles[i].t);
  const wrongTerrain = sea ? !t.sea : t.moveCost <= 0;
  return !!w.tiles[i].f || wrongTerrain || w.wanderers.some((x) => x.tile === i) || Object.values(w.pos).includes(i);
};

/** 地域の海のマスに、海の敵（幽霊船など）を1組置く（K4 段3）。置けたら返す */
export function spawnSeaWanderer(game: GameState, w: WorldState, rng: Rng, region: number): Wanderer | undefined {
  const reg = getScenario(game.scenarioId).map!.regions[region];
  if (!reg.seaEncounters?.length) return undefined;
  const heroes = Object.values(w.pos);
  const cands: number[] = [];
  for (let i = 0; i < w.tiles.length; i++) {
    const r = rowOf(w, i);
    if (r < reg.rows[0] || r > reg.rows[1] || blocked(w, i, true)) continue;
    if (heroes.some((h) => hexDistance(w, h, i) <= 2)) continue;
    cands.push(i);
  }
  if (!cands.length) return undefined;
  const tile = cands[rng.int(cands.length)];
  const group = reg.seaEncounters[rng.int(reg.seaEncounters.length)];
  const level = wandererLevel(game, w, region);
  const wd: Wanderer = { id: `w${w.nextWandererId++}`, tile, enemies: group.map((defId) => ({ defId, level })) };
  w.wanderers.push(wd);
  return wd;
}

/** 地域に敵を1組置く（見えているマス・キャラや町の近くは避ける）。置けたら返す */
export function spawnWanderer(game: GameState, w: WorldState, rng: Rng, region: number, at?: number): Wanderer | undefined {
  const def = getScenario(game.scenarioId).map!;
  const reg = def.regions[region];
  let tile = at;
  if (tile === undefined) {
    const heroes = Object.values(w.pos);
    const cands: number[] = [];
    for (let i = 0; i < w.tiles.length; i++) {
      const r = rowOf(w, i);
      if (r < reg.rows[0] || r > reg.rows[1] || blocked(w, i)) continue;
      if (heroes.some((h) => hexDistance(w, h, i) <= 2)) continue;
      cands.push(i);
    }
    if (!cands.length) return undefined;
    tile = cands[rng.int(cands.length)];
  }
  let group = reg.encounters[rng.int(reg.encounters.length)];
  // レアの組（K3）: 地域に rareEncounters がある時だけ、確率で置き換える（ある時だけ乱数を引くので、無い地域の流れは変わらない）。襲撃など場所を決めた配置では出さない
  let rare = false;
  if (at === undefined && reg.rareEncounters?.length && rng.next() * 100 < BALANCE.rareWandererChance) {
    group = reg.rareEncounters[rng.int(reg.rareEncounters.length)];
    rare = true;
  }
  const level = wandererLevel(game, w, region);
  const wd: Wanderer = { id: `w${w.nextWandererId++}`, tile, enemies: group.map((defId) => ({ defId, level })), ...(rare ? { rare: true as const } : {}) };
  w.wanderers.push(wd);
  return wd;
}

/** ワールドターンの終わりに、敵が少し動く（町・施設・キャラのいるマスには入らない） */
export function moveWanderers(w: WorldState, rng: Rng) {
  if (w.worldTurn % BALANCE.wandererMoveEvery !== 0) return;
  for (const wd of w.wanderers) {
    if (wd.raidTown || rng.next() < 0.5) continue;
    const atSea = !!TERRAINS.get(w.tiles[wd.tile].t).sea;
    const opts = neighbors(w, wd.tile).filter((n) => !blocked(w, n, atSea) && w.tiles[n].r === w.tiles[wd.tile].r);
    if (opts.length) wd.tile = opts[rng.int(opts.length)];
  }
}
