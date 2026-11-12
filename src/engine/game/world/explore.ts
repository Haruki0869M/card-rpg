// ===== 探索の仕組み（段階6）: 見晴らしの塔と、時間で消える出現スポット =====
// 塔は地図の施設（tile.f の kind 'tower'）。出現スポットは施設とは別に w.spawns に持ち、ワールドターンの終わりに出る・消える。
// 乱数はすべて GameState の rng から引く（オンライン・保存して再開でも同じ結果になる）。塔の配置は乱数を引かない。
import { BALANCE } from '../../../data/balance';
import { getScenario } from '../../../data/scenarios';
import { TERRAINS } from '../../../data/world';
import type { GameState, ScenarioMapDef, SpawnKind, TimedSpawn, WorldState } from '../../../types';
import type { Rng } from '../../rng';
import { addLog } from '../common';
import { mapHeroes } from '../heroes';
import { colOf, hexDistance, neighbors, rowOf } from './hex';
import { startTileOf } from './start';
import { isWideMap, laneOfCol } from './lanes';

export const SPAWN_KINDS: SpawnKind[] = ['star', 'peddler', 'thief'];
/** 出現スポットで始まるイベント（src/content/common/randomEvents/spawnEvents.ts。where: 'spawn'） */
export const SPAWN_EVENT: Record<SpawnKind, string> = { star: 'spawnStar', peddler: 'spawnPeddler', thief: 'spawnThief' };
export const SPAWN_NAME: Record<SpawnKind, string> = { star: '流れ星の落下地点', peddler: 'さすらいの行商人', thief: '黄金のコソ泥' };
export const WATCHTOWER_ID = 'watchtower';

/** そのマスの出現スポット */
export const spawnAt = (w: WorldState, tile: number): TimedSpawn | undefined => w.spawns?.find((s) => s.tile === tile);

/** 出現スポットが消えるまでのワールドターン数（今のターンを含む。1 なら「このターンまで」） */
export const spawnTurnsLeft = (w: WorldState, s: TimedSpawn) => Math.max(0, s.until - w.worldTurn + 1);

/** 陸の通れる地形か（海・山などの通れないマスには置かない） */
const land = (w: WorldState, i: number) => {
  const t = TERRAINS.get(w.tiles[i].t);
  return t.moveCost > 0 && !t.sea;
};

/** 陸を歩いて行けるマス（スタート・キャラの位置から） */
function walkableFrom(w: WorldState, starts: number[]): Set<number> {
  const seen = new Set(starts);
  const q = [...starts];
  for (let k = 0; k < q.length; k++) for (const n of neighbors(w, q[k])) if (!seen.has(n) && land(w, n)) { seen.add(n); q.push(n); }
  return seen;
}

// ---------- 見晴らしの塔 ----------

/**
 * 見晴らしの塔を置く（新しい冒険・古い保存の両方。乱数は引かない。地形・ほかの施設には触れない）。
 * 地図の高さで2〜3か所。道から歩いて1〜3マス（2マスを優先）の、寄り道になる空きマス。空きが無ければ置かない。置いた数を返す
 */
export function addWatchtowers(game: GameState, w: WorldState): number {
  const map = getScenario(game.scenarioId).map;
  if (!map) return 0;
  const existing = w.tiles.flatMap((t, i) => (t.f?.kind === 'tower' ? [i] : []));
  // 広い地図（段階6a）: 塔の数と帯は地図のデータ（prefer.tower。下から順）
  const lanes = isWideMap(game, w) ? map.prefer?.tower : undefined;
  const want = lanes?.length ?? (w.height >= BALANCE.watchtowerTallMap ? 3 : 2);
  if (existing.length >= want) return 0;
  const start = startTileOf(game, w); // 道を長くする前の古い地図でも、スタートの町のマスを使う
  const reach = walkableFrom(w, [start]);
  if (lanes) return addLaneTowers(game, w, map, lanes, existing, start, reach);
  // 道から歩いて何マスか
  const roadDist = new Map<number, number>();
  const q = [...reach].filter((i) => w.tiles[i].t === map.roadTerrain);
  for (const i of q) roadDist.set(i, 0);
  for (let k = 0; k < q.length; k++) {
    const d = roadDist.get(q[k])!;
    if (d >= 3) continue;
    for (const n of neighbors(w, q[k])) if (reach.has(n) && !roadDist.has(n)) { roadDist.set(n, d + 1); q.push(n); }
  }
  const occupied = new Set<number | undefined>([
    ...Object.values(w.pos), ...Object.values(w.downed ?? {}), ...w.wanderers.map((e) => e.tile), ...(w.spawns ?? []).map((s) => s.tile),
    game.event?.tile, game.chest?.tile, game.shrine?.tile, game.encounter?.tile, game.sanctuary?.tile,
  ]);
  const placed = [...existing];
  // 地図の下（スタート側）から上へ、等しい間隔の行を目安にする
  const targets = Array.from({ length: want }, (_, k) => (w.height - 1) * (1 - (k + 1) / (want + 1)));
  let added = 0;
  for (const targetRow of targets.slice(existing.length)) {
    const cands = [...roadDist.keys()].filter(
      (i) => roadDist.get(i)! >= 1 && land(w, i) && !w.tiles[i].f && !occupied.has(i) && hexDistance(w, i, start) >= 4 && placed.every((p) => hexDistance(w, p, i) >= 5),
    );
    cands.sort((a, b) => Math.abs(rowOf(w, a) - targetRow) - Math.abs(rowOf(w, b) - targetRow) || Math.abs(roadDist.get(a)! - 2) - Math.abs(roadDist.get(b)! - 2) || a - b);
    const tile = cands[0];
    if (tile === undefined) continue;
    w.tiles[tile].f = { kind: 'tower', id: WATCHTOWER_ID };
    placed.push(tile);
    added++;
  }
  return added;
}

/**
 * 広い地図の塔（段階6a。西2・東2）: 決めた帯の中で、目安の行に近く、道から歩いて TOWER_ROAD_STEPS マスくらいの空きマス。
 * 帯の中には道が少ないので、道からの距離に上限は付けない（歩いて行けるマスだけ）。乱数は引かない
 */
function addLaneTowers(game: GameState, w: WorldState, map: ScenarioMapDef, lanes: string[], existing: number[], start: number, reach: Set<number>): number {
  const roadDist = new Map<number, number>();
  const q = [...reach].filter((i) => w.tiles[i].t === map.roadTerrain);
  for (const i of q) roadDist.set(i, 0);
  for (let k = 0; k < q.length; k++) {
    const d = roadDist.get(q[k])!;
    for (const n of neighbors(w, q[k])) if (reach.has(n) && !roadDist.has(n)) { roadDist.set(n, d + 1); q.push(n); }
  }
  const occupied = new Set<number | undefined>([
    ...Object.values(w.pos), ...Object.values(w.downed ?? {}), ...w.wanderers.map((e) => e.tile), ...(w.spawns ?? []).map((s) => s.tile),
    game.event?.tile, game.chest?.tile, game.shrine?.tile, game.encounter?.tile, game.sanctuary?.tile,
  ]);
  const placed = [...existing];
  let added = 0;
  lanes.forEach((lane, k) => {
    if (k < existing.length) return;
    const targetRow = (w.height - 1) * (1 - (k + 1) / (lanes.length + 1));
    const cands = [...roadDist.keys()].filter(
      (i) => laneOfCol(map, colOf(w, i))?.id === lane && roadDist.get(i)! >= 1 && land(w, i) && !w.tiles[i].f && !occupied.has(i) && hexDistance(w, i, start) >= 4 && placed.every((p) => hexDistance(w, p, i) >= 5),
    );
    cands.sort((a, b) => Math.abs(rowOf(w, a) - targetRow) - Math.abs(rowOf(w, b) - targetRow) || Math.abs(roadDist.get(a)! - TOWER_ROAD_STEPS) - Math.abs(roadDist.get(b)! - TOWER_ROAD_STEPS) || a - b);
    const tile = cands[0];
    if (tile === undefined) return;
    w.tiles[tile].f = { kind: 'tower', id: WATCHTOWER_ID };
    placed.push(tile);
    added++;
  });
  return added;
}
/** 【提案】広い地図の塔の、道から歩いて何マスくらいの所に置くか */
const TOWER_ROAD_STEPS = 3;

/** 塔に登る: まわりの霧が晴れ、少し遠くの宝箱・神殿・祭壇・レアの敵も見える。手番は使わない。1つの塔は1回だけ */
export function climbWatchtower(game: GameState, w: WorldState, tile: number) {
  const r = BALANCE.watchtowerRadius;
  const far = BALANCE.watchtowerSpotRadius;
  const rareTiles = new Set(w.wanderers.filter((x) => x.rare).map((x) => x.tile));
  let chests = 0, sanct = 0, rares = 0;
  for (let i = 0; i < w.tiles.length; i++) {
    const d = hexDistance(w, tile, i);
    if (d > far) continue;
    const t = w.tiles[i];
    const spot = (t.f?.kind === 'chest' && !t.f.used) || t.f?.kind === 'temple' || t.f?.kind === 'altar' || rareTiles.has(i);
    if (d > r && !spot) continue;
    if (!t.seen) t.seen = true;
    if (t.f?.kind === 'chest' && !t.f.used) chests++;
    if (t.f?.kind === 'temple' || t.f?.kind === 'altar') sanct++;
    if (rareTiles.has(i)) rares++;
  }
  w.tiles[tile].f!.used = true;
  const found = [chests && `宝箱${chests}`, sanct && `転職の施設${sanct}`, rares && `レアの敵${rares}`].filter(Boolean).join('・');
  addLog(game, `見晴らしの塔に登り、まわりを見渡した。${found ? `（${found}が見えた）` : ''}`);
}

// ---------- 時間で消える出現スポット ----------

/** 次の出現までの間隔（乱数を1回引く） */
const nextInterval = (rng: Rng) => BALANCE.spawnEveryMin + rng.int(BALANCE.spawnEveryMax - BALANCE.spawnEveryMin + 1);

/** 出現スポットを置けるマス: 陸の空きマスで、世界マップにいるキャラから歩いて行けて、一番近いキャラから spawnDistance の範囲 */
function spawnCandidates(game: GameState, w: WorldState): number[] {
  const heroes = mapHeroes(game).map((h) => w.pos[h.id]).filter((i): i is number => i !== undefined);
  if (!heroes.length) return [];
  const reach = walkableFrom(w, heroes);
  const [lo, hi] = BALANCE.spawnDistance;
  const busy = new Set<number>([...heroes, ...Object.values(w.downed ?? {}), ...w.wanderers.map((x) => x.tile), ...(w.spawns ?? []).map((s) => s.tile)]);
  const out: number[] = [];
  for (const i of reach) {
    if (w.tiles[i].f || busy.has(i) || !land(w, i)) continue;
    const d = Math.min(...heroes.map((h) => hexDistance(w, h, i)));
    if (d >= lo && d <= hi) out.push(i);
  }
  return out.sort((a, b) => a - b);
}

/** 出現スポットを1つ置く（種類と場所を乱数で決める）。置けたら返す */
export function placeSpawn(game: GameState, w: WorldState, rng: Rng, kind?: SpawnKind): TimedSpawn | undefined {
  const cands = spawnCandidates(game, w);
  if (!cands.length) return undefined;
  let k = kind;
  if (!k) {
    const ws = SPAWN_KINDS.map((x) => BALANCE.spawnWeight[x]);
    let x = rng.next() * ws.reduce((a, b) => a + b, 0);
    k = SPAWN_KINDS[SPAWN_KINDS.length - 1];
    for (let i = 0; i < SPAWN_KINDS.length; i++) {
      x -= ws[i];
      if (x < 0) { k = SPAWN_KINDS[i]; break; }
    }
  }
  const tile = cands[rng.int(cands.length)];
  const n = w.nextSpawnId ?? 1;
  w.nextSpawnId = n + 1;
  const s: TimedSpawn = { id: `s${n}`, kind: k, tile, until: w.worldTurn + BALANCE.spawnLife[k] - 1 };
  (w.spawns ??= []).push(s);
  // 地図の上で見えるように、そのマスだけ霧を晴らす
  w.tiles[tile].seen = true;
  addLog(game, `${SPAWN_NAME[k]}が現れた！（あと${BALANCE.spawnLife[k]}ターン）`);
  return s;
}

/**
 * ワールドターンが進んだ時（worldTurn を足した後）: 期限が過ぎたスポットを消し、出る番なら1つ出す。
 * 置けるマスが無ければ、次のターンにもう一度試す。出る番でなければ乱数は引かない
 */
export function tickSpawns(game: GameState, w: WorldState, rng: Rng) {
  if (w.spawns?.length) {
    const gone = w.spawns.filter((s) => s.until < w.worldTurn);
    for (const s of gone) addLog(game, s.kind === 'thief' ? '黄金のコソ泥は、どこかへ逃げてしまった…' : s.kind === 'peddler' ? 'さすらいの行商人は、次の町へ去っていった' : '流れ星の光は、消えてしまった');
    w.spawns = w.spawns.filter((s) => s.until >= w.worldTurn);
  }
  w.nextSpawnAt ??= BALANCE.spawnFirstAt;
  if (w.worldTurn < w.nextSpawnAt) return;
  if (placeSpawn(game, w, rng)) w.nextSpawnAt = w.worldTurn + nextInterval(rng);
  else w.nextSpawnAt = w.worldTurn + 1;
}

/** 出現スポットに入る: スポットは消え、その種類のイベントが始まる（終わっても手番は続く。マップのイベントと同じ） */
export function enterSpawn(game: GameState, w: WorldState, s: TimedSpawn, party: string[]) {
  w.spawns = (w.spawns ?? []).filter((x) => x.id !== s.id);
  game.party = party;
  game.event = { tile: s.tile, eventId: SPAWN_EVENT[s.kind] };
  game.mode = 'event';
}
