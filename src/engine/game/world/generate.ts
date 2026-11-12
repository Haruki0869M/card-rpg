// ===== 世界マップの生成（spec §8.1） =====
// シナリオで決めた骨格（地域・町・ダンジョン・名所）＋ シードによるランダム要素（地形・宝箱・イベント・祠・徘徊する敵）。
// 町・ダンジョンは道でつなぎ、ランダムに置くものはスタート地点から歩いて行ける場所にだけ置く
import { BALANCE } from '../../../data/balance';
import { getScenario } from '../../../data/scenarios';
import { EVENTS } from '../../../data/events';
import { SHRINES, TERRAINS } from '../../../data/world';
import type { GameState, MapFeature, ScenarioMapDef, Tile, WorldState } from '../../../types';
import type { Rng } from '../../rng';
import { RARITIES } from '../dungeon';
import { pickWeighted } from '../loot';
import { colOf, hexDistance, idxOf, linePath, neighborInDir, neighbors, rowOf } from './hex';
import { revealAround } from './fog';
import { spawnSeaWanderer, spawnWanderer } from './wanderers';
import { addSanctuaries } from './sanctuaries';
import { addWatchtowers } from './explore';
import { laneOfCol } from './lanes';
import { assignDungeonThemes } from './randomDungeons';
import { initScourges } from './scourges';

const pick = <T,>(list: readonly T[], rng: Rng) => list[rng.int(list.length)];

/** 薬草の群生地のイベント（src/content/common/randomEvents/herbField.ts） */
export const HERB_EVENT = 'herbField';
/** 【提案】祠を「多く置く帯」に置く確率（外れたら地域のどこでも） */
const PREFER_CHANCE = 0.75;
/** 【提案】盆地・半島の宝箱が黄金箱になる確率（それ以外は装飾箱） */
const POCKET_LEGEND_CHANCE = 0.15;

/** 地域で一番多い、歩ける陸の地形（切れ目・入口のマスに使う） */
function mainLand(def: ScenarioMapDef, r: number): string {
  const terr = def.regions[r].terrain;
  const ids = Object.keys(terr).filter((id) => !TERRAINS.get(id).sea && TERRAINS.get(id).moveCost > 0);
  return ids.sort((a, b) => terr[b] - terr[a])[0] ?? def.roadTerrain;
}

/**
 * 広い地図の形（段階6a・overhaul-plan-v2 §2-2）: 仕切りの列と切れ目、盆地と半島。
 * 道・施設のマスには壁を置かない（道は必ず通れる。道が仕切りを横切る所は、そのまま通り道になる）
 */
function shapeWideMap(game: GameState, def: ScenarioMapDef, w: WorldState, rng: Rng): Set<number> {
  const { tiles } = w;
  /** 寄り道の入口（首）のマス。ランダムな物を置かない（入口が祠や宝箱でふさがって見えないように） */
  const necks = new Set<number>();
  const keep = (i: number) => tiles[i].t === def.roadTerrain || !!tiles[i].f;
  const blocked = (i: number) => TERRAINS.get(tiles[i].t).moveCost <= 0 && !TERRAINS.get(tiles[i].t).sea;
  const open = (i: number | undefined) => {
    if (i !== undefined && !keep(i) && blocked(i)) tiles[i].t = mainLand(def, tiles[i].r);
  };
  // 仕切り: 偶数の行は even 列、奇数の行は odd 列。切れ目は Rng で選ぶ
  for (const b of def.barriers ?? []) {
    const rows: number[] = [];
    for (let r = b.rows[0]; r <= b.rows[1]; r++) rows.push(r);
    // 端の行を除いた行を gaps 個の区間に分け、区間ごとに1行を選ぶ（前の切れ目のすぐ隣は避ける）
    const inner = rows.slice(1, -1);
    const gaps = new Set<number>();
    for (let k = 0; k < b.gaps; k++) {
      const part = inner.slice(Math.floor((k * inner.length) / b.gaps), Math.floor(((k + 1) * inner.length) / b.gaps));
      const cands = part.filter((r) => [...gaps].every((g) => Math.abs(g - r) >= 2));
      if (cands.length) gaps.add(cands[rng.int(cands.length)]);
    }
    const line = new Set(rows.map((r) => idxOf(w, r % 2 ? b.odd : b.even, r)));
    for (const r of rows) {
      const i = idxOf(w, r % 2 ? b.odd : b.even, r);
      if (keep(i)) continue;
      if (!gaps.has(r)) {
        tiles[i].t = b.terrain;
        continue;
      }
      // 切れ目（峠・橋）: そのマスと、左右の通れないマスを陸にする
      tiles[i].t = mainLand(def, tiles[i].r);
      for (const n of neighbors(w, i)) if (!line.has(n)) open(n);
    }
  }
  // 寄り道の地形: 中のマスに、良い宝箱（装飾箱以上）か祠を必ず置く
  const shrineIds = SHRINES.forScenario(game.scenarioId).map((s) => s.id);
  for (const p of def.pockets ?? []) {
    const at = idxOf(w, p.at[0], p.at[1]);
    const neck = neighborInDir(w, at, p.open);
    const walls = new Set<number>();
    if (p.kind === 'basin') {
      for (let d = 0; d < 6; d++) {
        const n = neighborInDir(w, at, d);
        if (n !== undefined && d !== p.open) walls.add(n);
      }
    } else if (neck !== undefined) {
      const beyond = neighborInDir(w, neck, p.open);
      for (const n of [...neighbors(w, at), ...neighbors(w, neck)]) if (n !== at && n !== neck && n !== beyond) walls.add(n);
    }
    for (const n of walls) if (!keep(n)) tiles[n].t = p.wall;
    // 中・入口（首）・入口の先は歩けるようにする
    tiles[at].t = mainLand(def, tiles[at].r);
    open(neck);
    if (neck !== undefined) {
      necks.add(neck);
      const beyond = neighborInDir(w, neck, p.open);
      open(beyond);
      // 入口の先から外へ出られるように、まわり（壁でない所）の通れないマスも陸にする
      for (const n of [...neighbors(w, neck), ...(beyond !== undefined ? neighbors(w, beyond) : [])]) if (!walls.has(n) && n !== at) open(n);
    }
    if (tiles[at].f) continue;
    if (p.content === 'shrine' && shrineIds.length) tiles[at].f = { kind: 'shrine', id: pick(shrineIds, rng) };
    else tiles[at].f = { kind: 'chest', id: 'mapChest', chest: { rarity: rng.next() < POCKET_LEGEND_CHANCE ? 'legend' : 'epic', locked: false } };
  }
  return necks;
}

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
      const tn = TERRAINS.get(w.tiles[n].t);
      if (seen.has(n) || (tn.moveCost <= 0 && !tn.sea)) continue; // 海は船で渡れるので、島にもランダムな物を置ける
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
  // 広い地図（段階6a）: 帯・街道の骨格・仕切り・寄り道の地形を使う。帯の無いシナリオは今までと同じ手順・同じ乱数の流れ
  const wide = !!def.lanes?.length;
  const tiles: Tile[] = [];
  for (let row = 0; row < height; row++) {
    const r = regionOfRow(def, row);
    const ids = Object.keys(def.regions[r].terrain);
    const weights = ids.map((id) => def.regions[r].terrain[id]);
    for (let col = 0; col < width; col++) {
      // 帯の倍率を、地域の割合に掛け合わせる（書いていない地形は1倍）
      const lane = wide ? laneOfCol(def, col) : undefined;
      const ws = lane ? ids.map((id, k) => weights[k] * (lane.terrain[id] ?? 1)) : weights;
      tiles.push({ t: ids[pickWeighted(ws, rng)], r, seen: false });
    }
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
  // 広い地図: 先に街道の骨格（点の並びを順に結ぶ）を引く。ほかの施設は、一番近い道のマスから脇道でつなぐ
  if (wide && def.highway?.length) {
    const pts = def.highway.map(([c, r]) => idxOf(w, c, r));
    for (let k = 1; k < pts.length; k++) {
      for (const p of linePath(w, pts[k - 1], pts[k])) {
        if (TERRAINS.get(tiles[p].t).sea) continue;
        tiles[p].t = def.roadTerrain;
        if (!connected.includes(p)) connected.push(p);
      }
    }
  }
  for (const { f, i } of [...fixed].sort((a, b) => hexDistance(w, start, a.i) - hexDistance(w, start, b.i))) {
    const from = connected.reduce((best, c) => (hexDistance(w, c, i) < hexDistance(w, best, i) ? c : best), connected[0]);
    const path = wide ? linePath(w, from, i) : straightPath(w, from, i);
    for (const p of path) if (!TERRAINS.get(tiles[p].t).sea) tiles[p].t = def.roadTerrain; // 海には道を引かない（船で渡る）
    if (wide) {
      for (const p of path) if (!connected.includes(p)) connected.push(p);
    } else connected.push(i);
    tiles[i].f = { kind: f.kind, id: f.id };
  }
  tiles[start].t = def.roadTerrain;
  // 広い地図: 仕切り（帯の間の通れない列と、切れ目）と寄り道の地形（盆地・半島）。道と施設のマスには置かない
  const reserved = wide ? shapeWideMap(game, def, w, rng) : new Set<number>();

  // 施設とスタートのまわりは陸にする（海のある地図だけ。小さすぎる島や、海の上の町を防ぐ。乱数は引かない）
  const landOf = (r: number) => {
    const terr = def.regions[r].terrain;
    const ids = Object.keys(terr).filter((id) => !TERRAINS.get(id).sea && TERRAINS.get(id).moveCost > 0);
    return ids.sort((a, b) => terr[b] - terr[a])[0] ?? def.roadTerrain;
  };
  const radius = def.landAround ?? 0;
  for (const c of [start, ...fixed.map((x) => x.i)]) {
    for (let i = 0; i < tiles.length; i++) {
      if (hexDistance(w, c, i) > radius || !TERRAINS.get(tiles[i].t).sea) continue;
      tiles[i].t = landOf(tiles[i].r);
    }
  }

  // ランダムに置くもの（歩いて行けて、何も無いマス。スタートの近くは避ける）
  const ok = walkable(w, start);
  const free = (row0: number, row1: number) =>
    [...ok].filter((i) => !tiles[i].f && !reserved.has(i) && !TERRAINS.get(tiles[i].t).sea && rowOf(w, i) >= row0 && rowOf(w, i) <= row1 && hexDistance(w, i, start) >= 2);
  const inLane = (lane: string | undefined) => (i: number) => laneOfCol(def, colOf(w, i))?.id === lane;
  const scenarioEvents = EVENTS.forScenario(game.scenarioId);
  const mapEvents = scenarioEvents.filter((e) => e.where === 'map' && !e.hiddenIn && !e.placed);
  const shrineIds = SHRINES.forScenario(game.scenarioId).map((s) => s.id);
  def.regions.forEach((reg, ri) => {
    /**
     * lane: その帯に置く（広い地図だけ）。only = 帯に空きが無い時だけほかへ / 無ければ確率 PREFER_CHANCE でその帯、外れたら地域のどこでも。
     * 帯を見ない時は、今までと同じ乱数の引き方
     */
    // 地域の空きマス（置くたびに作り直さず、置いたマスを抜く。並びは作り直した時と同じなので、選ばれるマスも同じ）
    let pool: number[] | undefined;
    const place = (n: number, make: () => MapFeature, lane?: string, only = false) => {
      for (let k = 0; k < n; k++) {
        pool ??= free(reg.rows[0], reg.rows[1]);
        let cands = pool;
        if (!cands.length) return;
        if (wide && lane) {
          const there = cands.filter(inLane(lane));
          if (there.length && (only || rng.next() < PREFER_CHANCE)) cands = there;
        }
        const tile = pick(cands, rng);
        pool.splice(pool.indexOf(tile), 1);
        tiles[tile].f = make();
      }
    };
    // 奥の地域ほど良い宝箱が出やすい
    const depth = def.regions.length - 1 - ri;
    place(reg.chests ?? 0, () => {
      const wts = [Math.max(20, 70 - depth * 12), 25 + depth * 4, 4 + depth * 4, 1 + depth];
      return { kind: 'chest', id: 'mapChest', chest: { rarity: RARITIES[pickWeighted(wts, rng)], locked: rng.next() < 0.3 } };
    });
    if (mapEvents.length) place(reg.events ?? 0, () => ({ kind: 'event', id: pick(mapEvents, rng).id }));
    // 薬草の群生地（段階6a）: 決めた帯に置く
    if (reg.herbs && EVENTS.tryGet(HERB_EVENT)) place(reg.herbs, () => ({ kind: 'event', id: HERB_EVENT }), def.prefer?.herb, true);
    if (shrineIds.length) place(reg.shrines ?? 0, () => ({ kind: 'shrine', id: pick(shrineIds, rng) }), def.prefer?.shrine);
    // ランダムダンジョン: prefer が配列なら、1つ目は1つ目の帯・2つ目は2つ目の帯（段階7a: 西と東に1つずつ）
    const rdLane = def.prefer?.randomDungeon;
    (reg.randomDungeons ?? []).forEach((d, k) => place(1, () => ({ kind: 'dungeon', id: d }), Array.isArray(rdLane) ? rdLane[k] : rdLane, true));
  });
  // 隠しボスの名所（K3 C）: 決めた地域の空いたマスに1つずつ。ほかの物を置き終えてから置くので、無いシナリオの地図は変わらない
  for (const e of scenarioEvents) {
    if (e.where !== 'map' || !e.hiddenIn) continue;
    const reg = def.regions.find((r) => r.id === e.hiddenIn);
    const cands = reg ? free(reg.rows[0], reg.rows[1]) : [];
    if (cands.length) tiles[pick(cands, rng)].f = { kind: 'event', id: e.id };
  }

  // キャラの位置（徘徊する敵はキャラの近くには置かない）
  const alive = game.heroes.filter((h) => !h.retired);
  for (const h of alive) w.pos[h.id] = start;

  // 徘徊する敵
  for (let ri = 0; ri < def.regions.length; ri++) for (let k = 0; k < def.regions[ri].wanderers; k++) spawnWanderer(game, w, rng, ri);
  // 海の徘徊する敵（幽霊船など。K4 段3）。陸の敵のあとに置くので、海の無いシナリオの乱数の流れは変わらない
  for (let ri = 0; ri < def.regions.length; ri++) for (let k = 0; k < (def.regions[ri].seaWanderers ?? 0); k++) spawnSeaWanderer(game, w, rng, ri);

  // 最初の手番
  w.turn = alive[0]?.id ?? '';
  w.prevTile = start;
  // スタートの地域は冒頭の物語で紹介済み
  w.visitedRegions.push(tiles[start].r);
  revealAround(game, w);
  addSanctuaries(game, w);
  // 見晴らしの塔（段階6）。乱数は引かないので、ほかの物の置き方は変わらない
  addWatchtowers(game, w);
  w.spawns = [];
  w.nextSpawnAt = BALANCE.spawnFirstAt;
  w.nextSpawnId = 1;
  // ランダムダンジョンのテーマ（段階7a）。最後に引くので、ほかの物の置き方は変わらない
  assignDungeonThemes(w, rng);
  // 災厄の中ボス（段階7b）: 広い地図だけ。まだ1体も出ていない（乱数は引かない）
  initScourges(game, w);
  return w;
}

export { straightPath };
