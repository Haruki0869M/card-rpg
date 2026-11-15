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

/** 薬草の群生地のイベント（src/content/common/randomEvents/herbField.ts）。地図の herbEvent を省略した時の「回復のマス」 */
export const HERB_EVENT = 'herbField';
/** その地図の「回復のマス」のイベントの id（シナリオ2の作り直し §2-1。省略は薬草の群生地） */
export const herbEventOf = (def: Pick<ScenarioMapDef, 'herbEvent'> | undefined): string => def?.herbEvent ?? HERB_EVENT;
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
  /** 潮のマス（シナリオ3の作り直し §3-1）: 仕切りの切れ目・盆地の首。全部作り終えてから置く（open() で陸に戻されないように）。inner = 首の中のマス */
  const tideLater: { i: number; terrain: string; inner?: number }[] = [];
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
    // 潮の切れ目: 切れ目を上から並べ、2つ目・4つ目…・3つ目・5つ目…の順に count 個（1つ目はいつも通れる切れ目に残す。乱数は引かない）
    if (b.tideGaps) {
      const real = [...gaps].sort((x, y) => x - y).filter((r) => !keep(idxOf(w, r % 2 ? b.odd : b.even, r)));
      const order = [...real.filter((_, k) => k % 2 === 1), ...real.filter((_, k) => k % 2 === 0 && k > 0)];
      for (const r of order.slice(0, Math.max(0, Math.min(b.tideGaps.count, real.length - 1)))) tideLater.push({ i: idxOf(w, r % 2 ? b.odd : b.even, r), terrain: b.tideGaps.terrain });
    }
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
      if (p.neck && !keep(neck)) tideLater.push({ i: neck, terrain: p.neck, inner: at });
      const beyond = neighborInDir(w, neck, p.open);
      open(beyond);
      // 入口の先から外へ出られるように、まわり（壁でない所）の通れないマスも陸にする
      for (const n of [...neighbors(w, neck), ...(beyond !== undefined ? neighbors(w, beyond) : [])]) if (!walls.has(n) && n !== at) open(n);
    }
    if (tiles[at].f) continue;
    if (p.content === 'shrine' && shrineIds.length) tiles[at].f = { kind: 'shrine', id: pick(shrineIds, rng) };
    else tiles[at].f = { kind: 'chest', id: 'mapChest', chest: { rarity: rng.next() < POCKET_LEGEND_CHANCE ? 'legend' : 'epic', locked: false } };
  }
  // 潮のマスを置く（壁になったマス・道・施設には置かない）。首の中のマスには「中から出られる」印（オーナーの決定 6-A）
  for (const x of tideLater) {
    if (keep(x.i) || blocked(x.i)) continue;
    tiles[x.i].t = x.terrain;
    if (x.inner !== undefined) tiles[x.inner].tideIn = true;
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
  // 祠を置かない帯（シナリオ2の西「凍った湖の近道」= 回復の場所が無い）。無い地図（シナリオ1）は今までどおり
  const noShrine = def.lanes?.some((l) => l.noShrine) ? (i: number) => !!laneOfCol(def, colOf(w, i))?.noShrine : undefined;
  const scenarioEvents = EVENTS.forScenario(game.scenarioId);
  const mapEvents = scenarioEvents.filter((e) => e.where === 'map' && !e.hiddenIn && !e.placed);
  const shrineIds = SHRINES.forScenario(game.scenarioId).map((s) => s.id);
  def.regions.forEach((reg, ri) => {
    /**
     * lane: その帯に置く（広い地図だけ）。only = 帯に空きが無い時だけほかへ / 無ければ確率 PREFER_CHANCE でその帯、外れたら地域のどこでも。
     * avoid: 候補から除くマス（祠を置かない帯。ほかに空きが無ければ除かない。乱数の引く回数は変わらない）。
     * 帯を見ない時は、今までと同じ乱数の引き方
     */
    // 地域の空きマス（置くたびに作り直さず、置いたマスを抜く。並びは作り直した時と同じなので、選ばれるマスも同じ）
    let pool: number[] | undefined;
    const place = (n: number, make: (tile: number) => MapFeature, lane?: string, only = false, avoid?: (tile: number) => boolean) => {
      for (let k = 0; k < n; k++) {
        pool ??= free(reg.rows[0], reg.rows[1]);
        let cands = pool;
        if (!cands.length) return;
        if (wide && lane) {
          const there = cands.filter(inLane(lane));
          if (there.length && (only || rng.next() < PREFER_CHANCE)) cands = there;
        }
        if (wide && avoid) {
          const rest = cands.filter((i) => !avoid(i));
          if (rest.length) cands = rest;
        }
        const tile = pick(cands, rng);
        pool.splice(pool.indexOf(tile), 1);
        tiles[tile].f = make(tile);
      }
    };
    // 奥の地域ほど良い宝箱が出やすい
    const depth = def.regions.length - 1 - ri;
    // 3つの道（2026-11-14）: 宝箱は prefer.chest の帯（東の丘）に多く置き、その帯の宝箱は chestDepth 段だけ奥の地域の重みで選ぶ（広い地図だけ）
    place(reg.chests ?? 0, (tile) => {
      const d = depth + (wide ? (laneOfCol(def, colOf(w, tile))?.chestDepth ?? 0) : 0);
      const wts = [Math.max(20, 70 - d * 12), 25 + d * 4, 4 + d * 4, 1 + d];
      return { kind: 'chest', id: 'mapChest', chest: { rarity: RARITIES[pickWeighted(wts, rng)], locked: rng.next() < 0.3 } };
    }, def.prefer?.chest);
    if (mapEvents.length) place(reg.events ?? 0, () => ({ kind: 'event', id: pick(mapEvents, rng).id }));
    // 薬草の群生地（段階6a）: 決めた帯に置く
    const herb = herbEventOf(def);
    if (reg.herbs && EVENTS.tryGet(herb)) place(reg.herbs, () => ({ kind: 'event', id: herb }), def.prefer?.herb, true);
    if (shrineIds.length) place(reg.shrines ?? 0, () => ({ kind: 'shrine', id: pick(shrineIds, rng) }), def.prefer?.shrine, false, noShrine);
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
