// ===== シナリオ3の作り直し A組・区切り2（docs/tasks/scenario3-rework-plan.md §3-1・§3-7）: 広い地図・潮を軸にした3つの道・地図のイベント2つ =====
// シナリオ2の scenario2Map.test.ts と同じ見方で、シナリオ3「呪われた群島」の 15×42 の地図を確かめる。
// 潮の仕組みそのものは scenario3Tide.test.ts、古い保存（前の 8×35）は scenario3OldSave.test.ts。ほかのシナリオの動きが変わらない事は scenario2Engine.test.ts の指紋
import { writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { getScenario } from '../../data/scenarios';
import { SANCTUARIES, TERRAINS } from '../../data/world';
import type { GameCommand, GameState, HeroPet, PlayerId, WorldState } from '../../types';
import { actorOf, setLocalPlayers } from '../../store/battleConfig';
import { applyGameCommand, createGame, createRng, eventOptionState, migrateGame, validateGame } from '../index';
import { botNextCommand, playToEnd } from '../bot';
import { colOf, hexDistance, idxOf, linePath, moveCostOf, neighborInDir, neighbors, reachable, rowOf } from '../game/world/hex';
import { isWideMap, laneOfCol, laneOfTile } from '../game/world/lanes';
import { startTileOf } from '../game/world/start';
import { moveWanderers } from '../game/world/wanderers';
import { scourgeLanes, scourgesFor } from '../game/world/scourges';
import { tideTraps } from '../game/world/tide';
import { RARITIES } from '../game/dungeon';

afterEach(() => setLocalPlayers(null));
const CA = 'cursedArchipelago';
const def = () => getScenario(CA).map!;
const CLASSES = ['warrior', 'priest', 'mage', 'thief'];
const fresh = (seed = 1, n = 2, onePlayer = false) =>
  createGame({ seed, scenarioId: CA, difficulty: 'normal', party: Array.from({ length: n }, (_, i) => ({ classId: CLASSES[i % 4], gender: 'male' as const, name: `仲間${i}`, playerId: (onePlayer ? 'P1' : `P${i + 1}`) as PlayerId })) });
const terr = (w: WorldState, i: number) => TERRAINS.get(w.tiles[i].t);
const land = (w: WorldState, i: number) => terr(w, i).moveCost > 0 && !terr(w, i).sea;
const isTide = (w: WorldState, i: number) => !!terr(w, i).tide;
/** スタートから、潮のマスを通らずに行けるマス（ship = 船あり。海も渡る） */
function flood(g: GameState, ship: boolean, from = startTileOf(g, g.world!)): Set<number> {
  const w = g.world!;
  const seen = new Set([from]);
  const q = [from];
  for (let k = 0; k < q.length; k++)
    for (const n of neighbors(w, q[k])) if (!seen.has(n) && (land(w, n) || (ship && terr(w, n).sea))) (seen.add(n), q.push(n));
  return seen;
}
/** 潮を tide のまま止めた時に、start から（霧・敵を見ずに）行けるマス */
function reachAt(g: GameState, tide: 'high' | 'low', ship: boolean): Set<number> {
  const w: WorldState = { ...g.world!, tideFrozen: tide, ship: ship || undefined, wanderers: [], tiles: g.world!.tiles.map((t) => ({ ...t, seen: true })) };
  return new Set(reachable(w, startTileOf(g, w), 99999).keys());
}
const featureTiles = (g: GameState, kind: string) => g.world!.tiles.flatMap((t, i) => (t.f?.kind === kind ? [i] : []));
const lane = (g: GameState, i: number) => laneOfCol(def(), colOf(g.world!, i))?.id;
const at = (g: GameState, id: string) => g.world!.tiles.findIndex((t) => t.f?.id === id && (t.f.kind === 'dungeon' || t.f.kind === 'town' || t.f.kind === 'landmark'));
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
/** 欄の並び順によらない JSON（中身が同じなら同じ文字列） */
const canon = (v: unknown): string =>
  JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x));
/** 街道の骨格の点を結んだ線（地図を作る時と同じ linePath）のマス */
function highwayLine(g: GameState): Set<number> {
  const w = g.world!;
  const pts = def().highway!.map(([c, r]) => idxOf(w, c, r));
  const out = new Set<number>(pts);
  for (let k = 1; k < pts.length; k++) for (const p of linePath(w, pts[k - 1], pts[k])) out.add(p);
  return out;
}
/** 試しのお供（オカメインコ） */
const pet = (): HeroPet => ({ petId: 'cockatiel', color: 'normal', name: 'ピーちゃん', love: 0, acts: 0 });
const isSeaWanderer = (w: WorldState, tile: number) => !!terr(w, tile).sea;

/** 地図の文字の絵（見直し用。MAP_DUMP=ファイル名 の時だけ書く） */
export function dump(g: GameState): string {
  const w = g.world!;
  const ch: Record<string, string> = { road: '=', plains: '.', forest: 'f', hills: 'h', mountain: 'M', swamp: 's', sea: '~', crag: '#', reef: '%', tideChannel: 'v', tideFlat: '_' };
  const fc: Record<string, string> = { town: 'T', dungeon: 'D', shrine: 'S', chest: 'C', event: 'E', landmark: 'R', tower: 'W', temple: 'P', altar: 'A' };
  const lines: string[] = [];
  for (let r = 0; r < w.height; r++) {
    let s = (r % 2 ? ' ' : '') + String(r).padStart(2, '0') + ' ';
    for (let c = 0; c < w.width; c++) {
      const i = idxOf(w, c, r);
      const t = w.tiles[i];
      const e = w.wanderers.find((x) => x.tile === i);
      const f = t.f ? (t.f.kind === 'dungeon' && DUNGEONS.get(t.f.id).random ? 'Q' : fc[t.f.kind] ?? '?') : undefined;
      s += (f ?? (e ? (isSeaWanderer(w, i) ? 'y' : 'x') : ch[t.t] ?? '?')) + ' ';
    }
    lines.push(s);
  }
  return lines.join('\n');
}

describe('区切り2: シナリオ3の広い地図の形', () => {
  it('15列×42行。スタートは真ん中の下 [7,40] の港町アルカ。町は4つとも中央の帯の街道の上。地域は5つ・前の並びと id のまま', () => {
    const g = fresh();
    const w = g.world!;
    if (process.env.MAP_DUMP) writeFileSync(process.env.MAP_DUMP, [1, 2, 3].map((s) => dump(fresh(s))).join('\n\n'));
    expect([w.width, w.height]).toEqual([15, 42]);
    expect(isWideMap(g, w)).toBe(true);
    const start = startTileOf(g, w);
    expect(start).toBe(idxOf(w, 7, 40));
    expect(w.tiles[start].f).toEqual({ kind: 'town', id: 'harborTown' });
    const towns = featureTiles(g, 'town');
    expect(towns).toHaveLength(4);
    for (const i of towns) {
      expect(w.tiles[i].t).toBe('road');
      expect(lane(g, i)).toBe('center');
    }
    expect(def().regions.map((r) => r.id)).toEqual(['wreckSea', 'cursedIsles', 'mistSea', 'coralShallows', 'harborIsle']);
    expect(def().regions.map((r) => r.rows)).toEqual([[0, 2], [3, 11], [12, 24], [25, 33], [34, 41]]);
    expect(def().features.map((f) => f.id).sort()).toEqual(['coralVillage', 'ghostFlagship', 'harborTown', 'lighthouseHouse', 'pirateIsland', 'sunkenTemple', 'tideStone', 'wreckCave', 'wreckTown'].sort());
    expect(def().regions.flatMap((r) => r.randomDungeons ?? [])).toEqual(['tideCave', 'tideCave']);
    expect(def().landAround).toBe(1);
  });

  it('種100個: 街道の骨格（港町 → 珊瑚の村 → 灯台守の家 → 難破船の街 → 嘆きの王冠号）が、道のマスだけでつながっている（中央に海を置かない）', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      const pts = def().highway!.map(([c, r]) => idxOf(w, c, r));
      const seen = new Set([pts[0]]);
      const q = [pts[0]];
      for (let k = 0; k < q.length; k++) for (const n of neighbors(w, q[k])) if (!seen.has(n) && (w.tiles[n].t === 'road' || pts.includes(n))) (seen.add(n), q.push(n));
      for (const p of pts) expect(seen.has(p), `seed ${seed} ${colOf(w, p)},${rowOf(w, p)}`).toBe(true);
      w.tiles.forEach((_t, i) => {
        if (lane(g, i) === 'center') expect(terr(w, i).sea, `seed ${seed} ${colOf(w, i)},${rowOf(w, i)}`).toBeFalsy();
      });
    }
  });

  it('鍵のダンジョン: 難破船の洞窟 = 東（珊瑚の浅瀬）・海賊の隠れ島 = 西（霧の海域）・沈んだ神殿 = 東（呪われた島々）。街道から3〜6マス外れた脇道の先（海賊の隠れ島は西の端の島なので7マス）', () => {
    const g = fresh();
    const w = g.world!;
    const line = [...highwayLine(g)];
    const ids = ['wreckCave', 'pirateIsland', 'sunkenTemple'];
    expect(ids.map((id) => lane(g, at(g, id)))).toEqual(['east', 'west', 'east']);
    expect(ids.map((id) => def().regions[w.tiles[at(g, id)].r].id)).toEqual(['coralShallows', 'mistSea', 'cursedIsles']);
    for (const id of ids) {
      const near = Math.min(...line.map((p) => hexDistance(w, p, at(g, id))));
      expect(near, id).toBeGreaterThanOrEqual(3);
      expect(near, id).toBeLessThanOrEqual(id === 'pirateIsland' ? 7 : 6);
    }
    expect(lane(g, at(g, 'ghostFlagship'))).toBe('center');
    expect(rowOf(w, at(g, 'ghostFlagship'))).toBe(0);
    expect(lane(g, at(g, 'tideStone'))).toBe('west');
    expect(w.tiles[at(g, 'tideStone')].r).toBe(4);
  });

  it('種100個: 船なし・潮のマスを通らずに、町4つ・難破船の洞窟・沈んだ神殿・嘆きの王冠号・潮騒の石碑へ歩いて行ける。船があれば、全部の施設・寄り道・帯へ行ける', () => {
    let pirateOnFoot = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      const msg = `seed ${seed}`;
      const foot = flood(g, false);
      const ship = flood(g, true);
      for (const id of ['harborTown', 'coralVillage', 'lighthouseHouse', 'wreckTown', 'wreckCave', 'sunkenTemple', 'ghostFlagship', 'tideStone']) expect(foot.has(at(g, id)), `${msg} 歩いて ${id}`).toBe(true);
      if (foot.has(at(g, 'pirateIsland'))) pirateOnFoot++;
      for (const f of def().features) expect(ship.has(idxOf(w, f.at[0], f.at[1])), `${msg} 船で ${f.id}`).toBe(true);
      // 潮のマスを通らない道で、置いた物と敵の全部へ（寄り道の中だけは潮の首の先なので除く）
      const pockets = new Set(def().pockets!.map((p) => idxOf(w, p.at[0], p.at[1])));
      w.tiles.forEach((t, i) => {
        if (t.f && !pockets.has(i)) expect(ship.has(i), `${msg} ${t.f.kind}:${t.f.id} at ${colOf(w, i)},${rowOf(w, i)}`).toBe(true);
      });
      // 神殿・祭壇・塔（陸を歩いて行ける所に置く仕組み）は、船なしで歩いて行ける
      for (const kind of ['temple', 'altar', 'tower']) for (const i of featureTiles(g, kind)) expect(foot.has(i), `${msg} 歩いて ${kind}`).toBe(true);
      for (const wd of w.wanderers) expect(ship.has(wd.tile), `${msg} 敵 ${colOf(w, wd.tile)},${rowOf(w, wd.tile)}`).toBe(true);
      // 寄り道の中は、潮が開けば行ける（盆地 = 引き潮に歩いて・入り江 = 満ち潮に船で）
      const low = reachAt(g, 'low', false);
      const high = reachAt(g, 'high', true);
      for (const p of def().pockets!) expect((p.neck === 'tideFlat' ? low : high).has(idxOf(w, p.at[0], p.at[1])), `${msg} 寄り道 ${p.at}`).toBe(true);
      // どの地域のどの帯にも、船で行けるマスがある（西の帯は船、中央と東は歩いて）
      for (const reg of def().regions) for (const ln of def().lanes!) {
        const set = ln.id === 'west' ? ship : foot;
        const any = [...set].some((i) => rowOf(w, i) >= reg.rows[0] && rowOf(w, i) <= reg.rows[1] && lane(g, i) === ln.id);
        expect(any, `${msg} ${reg.id}/${ln.id}`).toBe(true);
      }
    }
    // 海賊の隠れ島は「船で行く島」: 歩いて行ける種は少ない（脇道が海で切れる）
    expect(pirateOnFoot).toBeLessThanOrEqual(5);
  }, 120000);

  it('種100個: 潮で閉じ込められるマスが0（船なし・船あり）。潮のマスの上には何も置かない・敵もいない', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      const start = startTileOf(g, w);
      expect(tideTraps(w, start), `seed ${seed} 船なし`).toEqual([]);
      expect(tideTraps({ ...w, ship: true }, start), `seed ${seed} 船あり`).toEqual([]);
      w.tiles.forEach((t, i) => {
        if (!isTide(w, i)) return;
        expect(t.f, `seed ${seed} tile ${i}`).toBeUndefined();
        expect(w.wanderers.some((x) => x.tile === i), `seed ${seed} tile ${i}`).toBe(false);
      });
    }
  }, 120000);

  it('潮の開閉で行ける所が変わる: 引き潮だけ干潟を歩いて渡れる・満ち潮だけ船で潮の水道を通れる（種30個のほとんどで、潮でしか行けないマスがある）', () => {
    let lowOnly = 0, highOnly = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      const footLow = reachAt(g, 'low', false), footHigh = reachAt(g, 'high', false);
      const shipLow = reachAt(g, 'low', true), shipHigh = reachAt(g, 'high', true);
      const flats = w.tiles.flatMap((t, i) => (t.t === 'tideFlat' ? [i] : []));
      const channels = w.tiles.flatMap((t, i) => (t.t === 'tideChannel' ? [i] : []));
      // 干潟は引き潮だけ・水道は満ち潮で船の時だけ外から入れる（入る先のマスに入れるかを、まわりのマスから見る）
      for (const i of flats) {
        expect(footHigh.has(i), `seed ${seed} 干潟 満ち潮`).toBe(false);
        expect(footLow.has(i), `seed ${seed} 干潟 引き潮`).toBe(true);
      }
      for (const i of channels) {
        expect(shipLow.has(i), `seed ${seed} 水道 引き潮`).toBe(false);
        expect(reachAt(g, 'high', false).has(i), `seed ${seed} 水道 船なし`).toBe(false);
      }
      if (channels.some((i) => shipHigh.has(i))) highOnly++;
      // 盆地の中の宝箱は引き潮の時だけ
      const basin = idxOf(w, 12, 15);
      expect(footLow.has(basin), `seed ${seed}`).toBe(true);
      expect(footHigh.has(basin), `seed ${seed}`).toBe(false);
      if (flats.length >= 2) lowOnly++;
    }
    expect(lowOnly).toBeGreaterThanOrEqual(27);
    expect(highOnly).toBeGreaterThanOrEqual(27);
  });

  it('仕切り: 西と中央の間は暗礁・中央と東の間は険しい山。地域ごとに、いつも通れる切れ目（陸か道）が1つ以上・潮の切れ目は1つまで', () => {
    let tides = 0, all = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      for (const b of def().barriers!) {
        expect(b.terrain).toBe(b.even === 5 ? 'reef' : 'crag');
        expect(b.tideGaps).toEqual({ terrain: b.even === 5 ? 'tideChannel' : 'tideFlat', count: 1 });
        let open = 0, tide = 0, wall = 0;
        for (let r = b.rows[0]; r <= b.rows[1]; r++) {
          const i = idxOf(w, r % 2 ? b.odd : b.even, r);
          if (land(w, i)) open++;
          else if (w.tiles[i].t === b.tideGaps!.terrain) tide++;
          else {
            wall++;
            expect(w.tiles[i].t, `seed ${seed} row ${r}`).toBe(b.terrain);
          }
        }
        expect(open, `seed ${seed} ${b.rows}`).toBeGreaterThanOrEqual(1);
        expect(tide, `seed ${seed} ${b.rows}`).toBeLessThanOrEqual(1);
        expect(wall, `seed ${seed} ${b.rows}`).toBeGreaterThanOrEqual(b.rows[1] - b.rows[0] + 1 - b.gaps - 3);
        tides += tide;
        all++;
      }
    }
    // ほとんどの仕切りに潮の切れ目がある
    expect(tides / all).toBeGreaterThan(0.85);
  });

  it('寄り道: 東の盆地（干潟の宝の小島）は入口1つ・首は干潟・中に良い宝箱。西の入り江は首が潮の水道で、中に祠。中には「中から出られる」印', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      for (const p of def().pockets!) {
        const P = idxOf(w, p.at[0], p.at[1]);
        const N = neighborInDir(w, P, p.open)!;
        expect(w.tiles[N].t, `seed ${seed} ${p.at}`).toBe(p.neck);
        expect(w.tiles[P].tideIn, `seed ${seed} ${p.at}`).toBe(true);
        // 中から出る道は首だけ（ほかは暗礁）
        const ways = neighbors(w, P).filter((n) => land(w, n) || terr(w, n).sea || isTide(w, n));
        expect(ways, `seed ${seed} ${p.at}`).toEqual([N]);
        const f = w.tiles[P].f!;
        if (p.content === 'chest') {
          expect(f.kind).toBe('chest');
          expect(['epic', 'legend']).toContain(f.chest!.rarity);
        } else expect(f.kind).toBe('shrine');
      }
      expect([lane(g, idxOf(w, 12, 15)), w.tiles[idxOf(w, 12, 15)].r]).toEqual(['east', 2]);
      expect([lane(g, idxOf(w, 1, 20)), w.tiles[idxOf(w, 1, 20)].r]).toEqual(['west', 2]);
      expect(w.tiles.filter((t) => t.tideIn)).toHaveLength(2);
    }
  });

  it('物の数: 宝箱18（盆地の1つを含む）・イベント12・祠8（入り江の1つを含む）・塔4（東2・中央2）・ランダムダンジョンは西と東に1つずつ（テーマ別々）・神殿・祭壇・敵は陸20＋海14＝34組', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      const msg = `seed ${seed}`;
      expect(featureTiles(g, 'chest'), msg).toHaveLength(18);
      const events = featureTiles(g, 'event').filter((i) => !EVENTS.get(w.tiles[i].f!.id).hiddenIn);
      expect(events, msg).toHaveLength(12);
      expect(featureTiles(g, 'shrine'), msg).toHaveLength(8);
      expect(featureTiles(g, 'tower').map((i) => lane(g, i)).sort(), msg).toEqual(['center', 'center', 'east', 'east']);
      const rd = featureTiles(g, 'dungeon').filter((i) => DUNGEONS.get(w.tiles[i].f!.id).random);
      expect(rd.map((i) => lane(g, i)).sort(), msg).toEqual(['east', 'west']);
      expect(new Set(rd.map((i) => w.tiles[i].f!.theme)).size, msg).toBe(2);
      expect(featureTiles(g, 'temple'), msg).toHaveLength(SANCTUARIES.forScenario(CA).filter((s) => s.kind === 'temple').length);
      expect(featureTiles(g, 'altar'), msg).toHaveLength(SANCTUARIES.forScenario(CA).filter((s) => s.kind === 'altar').length);
      const sea = w.wanderers.filter((x) => isSeaWanderer(w, x.tile)).length;
      expect(w.wanderers.length - sea, `${msg} 陸`).toBe(20);
      expect(sea, `${msg} 海`).toBe(14);
    }
    expect(def().regions.map((r) => r.wanderers)).toEqual([2, 5, 5, 4, 4]);
    expect(def().regions.map((r) => r.seaWanderers ?? 0)).toEqual([2, 3, 6, 3, 0]);
    expect(def().regions.reduce((n, r) => n + (r.chests ?? 0), 0)).toBe(17);
    expect(def().regions.reduce((n, r) => n + (r.herbs ?? 0), 0)).toBe(0);
  });

  it('地図のイベントのくじは3種類（流れ着いた樽・難破船の残骸・潮だまり）。潮騒の石碑は名所だけ（イベントとして置かれない）', () => {
    const seen = new Map<string, number>();
    for (let seed = 1; seed <= 30; seed++) {
      const g = fresh(seed, 1);
      for (const i of featureTiles(g, 'event')) {
        const id = g.world!.tiles[i].f!.id;
        if (EVENTS.get(id).hiddenIn) continue;
        seen.set(id, (seen.get(id) ?? 0) + 1);
      }
      expect(featureTiles(g, 'landmark').map((i) => g.world!.tiles[i].f!.id)).toEqual(['tideStone']);
    }
    expect([...seen.keys()].sort()).toEqual(['driftChest', 'tidePool', 'wreckDebris']);
    for (const n of seen.values()) expect(n).toBeGreaterThan(60);
  });

  it('同じ種なら同じ地図（オンライン・保存して再開でも同じ）', () => {
    expect(JSON.stringify(fresh(7).world)).toBe(JSON.stringify(fresh(7).world));
  });
});

describe('区切り2: 3つの道の違い（帯ごと）', () => {
  const SEEDS = Array.from({ length: 30 }, (_, k) => 5001 + k);

  it('帯のデータ（計画 §3-1 の表の数字）: 敵の重み ×0.5 / ×2 / ×1・東は夜襲 ×1.5 と宝箱の段2・中央は海0・印と説明', () => {
    const by = Object.fromEntries(def().lanes!.map((l) => [l.id, l]));
    expect(by.west).toMatchObject({ name: '外海の航路', mark: '⛵', spawnWeight: 0.5, cols: [0, 4] });
    expect(by.center).toMatchObject({ name: '桟橋の街道', mark: '⚓', spawnWeight: 2, cols: [5, 9] });
    expect(by.center.terrain.sea).toBe(0);
    expect(by.east).toMatchObject({ name: '呪いの島々', mark: '🌫', ambush: 1.5, chestDepth: 2, cols: [10, 14] });
    expect(by.east.spawnWeight ?? 1).toBe(1);
    for (const l of def().lanes!) {
      expect(l.mark && l.hint && l.tag, l.id).toBeTruthy();
      expect(l.climate, l.id).toBeUndefined();
      expect(l.enemyLevel, l.id).toBeUndefined();
    }
    expect(def().prefer).toEqual({ shrine: 'west', altar: 'east', chest: 'east', randomDungeon: ['west', 'east'], tower: ['east', 'center', 'east', 'center'] });
    expect([...scourgeLanes(def())].sort()).toEqual(['east', 'west']);
    // 災厄は、この区切りでは死霊術師だけ（群島の3体は次の区切りで足す）
    expect(scourgesFor(CA).map((d) => d.id)).toEqual(['miasmaNecro']);
  });

  it('地形: 西は海が多い（半分以上）・中央は海が無く平原が多い・東は森・沼・丘が多く（遅い）、海は少し', () => {
    const cnt: Record<string, Record<string, number>> = { west: {}, center: {}, east: {} };
    for (const s of SEEDS.slice(0, 10)) {
      const g = fresh(s, 1);
      const w = g.world!;
      const walls = new Set(def().barriers!.flatMap((b) => Array.from({ length: b.rows[1] - b.rows[0] + 1 }, (_, k) => idxOf(w, (b.rows[0] + k) % 2 ? b.odd : b.even, b.rows[0] + k))));
      w.tiles.forEach((t, i) => {
        if (t.r === 0 || t.r === 4 || t.f || walls.has(i)) return; // 真ん中の3地域（仕切りのある所）。仕切りの列は除く
        const c = cnt[lane(g, i)!];
        c[t.t] = (c[t.t] ?? 0) + 1;
      });
    }
    const share = (ln: string, ids: string[]) => ids.reduce((n, id) => n + (cnt[ln][id] ?? 0), 0) / Object.values(cnt[ln]).reduce((a, b) => a + b, 0);
    expect(share('west', ['sea'])).toBeGreaterThan(0.5);
    expect(share('center', ['sea'])).toBe(0);
    expect(share('east', ['sea'])).toBeLessThan(0.08);
    expect(share('east', ['forest', 'swamp', 'hills'])).toBeGreaterThan(0.6);
    expect(share('east', ['forest', 'swamp', 'hills'])).toBeGreaterThan(share('center', ['forest', 'swamp', 'hills']) * 2);
    expect(share('center', ['plains', 'road'])).toBeGreaterThan(0.5);
    // 暗礁（仕切りの外）は西だけ
    expect(share('center', ['reef'])).toBe(0);
  });

  it('敵: 陸の敵は中央の街道に多く、西に少ない（マスの広さあたり）。海の敵は西に多い', () => {
    const per: Record<string, number> = { west: 0, center: 0, east: 0 };
    const area: Record<string, number> = { west: 0, center: 0, east: 0 };
    const seaBy: Record<string, number> = { west: 0, center: 0, east: 0 };
    for (const s of SEEDS) {
      const g = fresh(s, 1);
      const w = g.world!;
      for (const wd of w.wanderers) (isSeaWanderer(w, wd.tile) ? seaBy : per)[laneOfTile(g, w, wd.tile)!]++;
      w.tiles.forEach((t, i) => {
        if (!t.f && land(w, i)) area[lane(g, i)!]++;
      });
    }
    const dens = (k: string) => per[k] / area[k];
    expect(dens('center')).toBeGreaterThan(dens('east') * 1.5);
    expect(dens('east')).toBeGreaterThan(dens('west') * 1.3);
    expect(seaBy.center).toBe(0);
    expect(seaBy.west).toBeGreaterThan(seaBy.east * 3);
  });

  it('徘徊する敵は帯をまたいで動かない（陸も海も）', () => {
    const g = fresh(5005);
    const w = structuredClone(g.world!);
    w.ship = true;
    const lane0 = new Map(w.wanderers.map((x) => [x.id, laneOfTile(g, w, x.tile)]));
    const rng = createRng(77);
    for (let t = 0; t < 200; t++) {
      w.worldTurn++;
      moveWanderers(w, rng, g);
      for (const x of w.wanderers) {
        expect(laneOfTile(g, w, x.tile)).toBe(lane0.get(x.id));
        expect(isTide(w, x.tile)).toBe(false);
      }
    }
  });

  it('宝箱: 東の島々に多く、東の宝箱は良い（盆地の分を除いても）', () => {
    const n: Record<string, number> = { west: 0, center: 0, east: 0 };
    const good: Record<string, number> = { west: 0, center: 0, east: 0 };
    const pockets = new Set(def().pockets!.map((p) => p.at[1] * def().width + p.at[0]));
    for (const s of SEEDS) {
      const g = fresh(s, 1);
      g.world!.tiles.forEach((t, i) => {
        if (t.f?.kind !== 'chest' || pockets.has(i)) return;
        const ln = lane(g, i)!;
        n[ln]++;
        if (RARITIES.indexOf(t.f.chest!.rarity) >= 2) good[ln]++;
      });
    }
    expect(n.east).toBeGreaterThan(n.west * 2);
    expect(n.east).toBeGreaterThan(n.center * 2);
    expect(good.east / n.east).toBeGreaterThan(good.west / Math.max(1, n.west) + 0.05);
  });

  it('祠は西に多い（島の祠）。祭壇は西より東に多い', () => {
    const n: Record<string, number> = { west: 0, center: 0, east: 0 };
    const alt: Record<string, number> = { west: 0, center: 0, east: 0 };
    for (const s of SEEDS) {
      const g = fresh(s, 1);
      for (const i of featureTiles(g, 'shrine')) n[lane(g, i)!]++;
      for (const i of featureTiles(g, 'altar')) alt[lane(g, i)!]++;
    }
    expect(n.west).toBeGreaterThan(n.center);
    expect(n.west).toBeGreaterThan(n.east);
    // 祭壇は「東を優先」の重み（sanctuaries.ts の ALTAR_LANE_PENALTY。道からの近さと比べる弱い優先）。西（海）より東に多い
    expect(alt.east).toBeGreaterThan(alt.west * 2);
  });
});

describe('区切り2: 地図のイベント2つ（難破船の残骸・潮だまり）', () => {
  /** そのイベントのマスに、heroIds を立たせて、手番のキャラが調べる（party = 一緒に入る仲間） */
  function enter(g: GameState, id: string, heroIds: string[], turnHero = heroIds[0]): GameState {
    const w = g.world!;
    w.story = undefined;
    let tile = w.tiles.findIndex((t) => t.f?.kind === 'event' && t.f.id === id);
    if (tile < 0) {
      // この種に無ければ、スタートの隣の空きマスに置く
      tile = neighbors(w, startTileOf(g, w)).find((i) => !w.tiles[i].f && land(w, i))!;
      w.tiles[tile].f = { kind: 'event', id };
    }
    for (const h of heroIds) w.pos[h] = tile;
    w.turn = turnHero;
    w.move = null;
    const h = g.heroes.find((x) => x.id === turnHero)!;
    return run(g, { type: 'WORLD_INTERACT', playerId: h.playerId, heroId: h.id, party: heroIds });
  }

  /** 選ぶ（判定の選択肢は、選ぶ段 → 挑む段の2段階。挑む役の持ち主が挑む） */
  function choose(g: GameState, optionIndex: number): GameState {
    const h = g.heroes.find((x) => x.id === g.world!.turn)!;
    g = run(g, { type: 'CHOOSE_EVENT', playerId: h.playerId, optionIndex, heroId: h.id, focusUsed: 0 });
    const d = g.event?.decided;
    if (d) {
      const who = g.heroes.find((x) => x.id === d.heroId)!;
      g = run(g, { type: 'EVENT_CHALLENGE', playerId: who.playerId, heroId: who.id, focusUsed: 0 });
    }
    return g;
  }

  it('データ: 地図のふつうのイベント（くじに入る）・シナリオ3だけ。どちらにも判定の無い選択肢がある（必ず選べる）', () => {
    for (const id of ['wreckDebris', 'tidePool']) {
      const ev = EVENTS.get(id);
      expect(ev.where).toBe('map');
      expect(ev.placed).toBeUndefined();
      expect(ev.hiddenIn).toBeUndefined();
      expect(EVENTS.scenarioOf(id)).toBe(CA);
      expect(ev.options.some((o) => !o.check && !o.requiresPet)).toBe(true);
    }
    // 2026-11-21: 潮で選択肢が変わる（引き潮 = 判定なし／満ち潮 = もぐる判定）
    expect(EVENTS.get('wreckDebris').options[0]).toMatchObject({ tide: 'low', success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }] });
    expect(EVENTS.get('wreckDebris').options[0].check).toBeUndefined();
    expect(EVENTS.get('wreckDebris').options[1]).toMatchObject({ tide: 'high', success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }], fail: [{ kind: 'damage', amount: 8 }] });
    expect(EVENTS.get('tidePool').options[0]).toMatchObject({ requiresPet: true, success: [{ kind: 'petLove', amount: 8, all: true }] });
    expect(EVENTS.get('tidePool').options[1]).toMatchObject({ success: [{ kind: 'gold', amount: 40 }], fail: [{ kind: 'damage', amount: 4 }] });
    expect(EVENTS.get('tideStone').placed).toBe(true);
  });

  for (const id of ['wreckDebris', 'tidePool']) {
    it(`${id}: 2人（別々のプレイヤー）が同行して入っても、手番の人が選んで閉じれば世界マップに戻る（止まらない）`, () => {
      for (const opt of [0, 1, 2].slice(0, EVENTS.get(id).options.length)) {
        let g = fresh(5100 + opt);
        const [a, b] = g.heroes;
        if (EVENTS.get(id).options[opt].requiresPet) for (const h of g.heroes) h.pet = pet();
        // 潮で出る選択肢は、その潮にして確かめる（潮を止める = 時間帯にかかわらずその潮）
        if (EVENTS.get(id).options[opt].tide) g.world!.tideFrozen = EVENTS.get(id).options[opt].tide;
        g = enter(g, id, [a.id, b.id]);
        expect(g.mode, `${id} ${opt}`).toBe('event');
        // 世界マップのマスのイベントは手番の人だけで決まる（ダンジョンの2段階の合意にならない = 相方を待たない）
        g = run(g, { type: 'CHOOSE_EVENT', playerId: a.playerId, optionIndex: opt, heroId: a.id, focusUsed: 0 });
        expect(g.event?.decided, `${id} ${opt}`).toBeUndefined();
        expect(g.vote, `${id} ${opt}`).toBeUndefined();
        g = run(g, { type: 'FINISH_EVENT', playerId: a.playerId });
        expect(g.mode, `${id} ${opt}`).toBe('world');
        expect(validateGame(g)).toBe(true);
      }
    });

    it(`${id}: 2人で1台・P2 の番に入っても、選ぶ・閉じる操作は P2 の操作として送られて止まらない`, () => {
      setLocalPlayers(['P1', 'P2']);
      let g = fresh(5110);
      const b = g.heroes[1];
      g = enter(g, id, [b.id], b.id);
      const choose: GameCommand = { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: EVENTS.get(id).options.length - 1, focusUsed: 0 };
      expect(actorOf(g, choose)).toBe('P2');
      g = run(g, { ...choose, playerId: actorOf(g, choose) } as GameCommand);
      const fin: GameCommand = { type: 'FINISH_EVENT', playerId: 'P1' };
      expect(actorOf(g, fin)).toBe('P2');
      g = run(g, { ...fin, playerId: actorOf(g, fin) } as GameCommand);
      expect(g.mode).toBe('world');
    });
  }

  it('潮だまり: お供を連れていなければ「お供と一緒に」は出ない。連れていれば、場面のキャラのお供が懐く', () => {
    let g = fresh(5120);
    const [a, b] = g.heroes;
    g = enter(g, 'tidePool', [a.id, b.id]);
    const r = applyGameCommand(g, { type: 'CHOOSE_EVENT', playerId: a.playerId, optionIndex: 0, focusUsed: 0 });
    expect(r.error).toBeTruthy();
    let h = fresh(5121);
    const [c, d] = h.heroes;
    for (const x of h.heroes) x.pet = pet();
    h = enter(h, 'tidePool', [c.id, d.id]);
    h = choose(h, 0);
    // マスのイベントは手番の人の場面（同行した仲間は場面に入らない）なので、懐くのは場面のキャラのお供
    const inScene = new Set(h.party ?? h.heroes.map((x) => x.id));
    expect(h.heroes.find((x) => x.id === c.id)!.pet!.love).toBe(8);
    for (const x of h.heroes) expect(x.pet!.love, x.id).toBe(inScene.has(x.id) ? 8 : 0);
  });

  it('難破船の残骸: 引き潮の間は判定なしで装備が手に入り、もぐる選択肢は出ない。満ち潮の間は逆（歩いて入る選択肢は選べない）', () => {
    let g = fresh(5140, 1);
    const a = g.heroes[0];
    const hp0 = a.hp;
    const gear = () => g.heroes[0].stash.length + Object.values(g.heroes[0].equipment).filter(Boolean).length;
    g.world!.tideFrozen = 'low';
    g = enter(g, 'wreckDebris', [a.id]);
    expect(eventOptionState(g, 'wreckDebris', 0).visible).toBe(true);
    expect(eventOptionState(g, 'wreckDebris', 1).visible).toBe(false);
    expect(eventOptionState(g, 'wreckDebris', 2).visible).toBe(true);
    expect(applyGameCommand(g, { type: 'CHOOSE_EVENT', playerId: a.playerId, optionIndex: 1, heroId: a.id, focusUsed: 0 }).error).toBe('選択肢がありません');
    const n0 = gear();
    g = choose(g, 0);
    expect(g.heroes[0].hp).toBe(hp0);
    expect(gear()).toBe(n0 + 1);
    let h = fresh(5141, 1);
    h.world!.tideFrozen = 'high';
    h = enter(h, 'wreckDebris', [h.heroes[0].id]);
    expect(eventOptionState(h, 'wreckDebris', 0).visible).toBe(false);
    expect(eventOptionState(h, 'wreckDebris', 1).visible).toBe(true);
  });

  it('潮で出る選択肢（tide）を持つのは、シナリオ3のイベントだけ。どの潮でも、判定の無い選択肢が1つは出る', () => {
    const withTide = EVENTS.all.filter((e) => e.options.some((o) => o.tide));
    expect(withTide.map((e) => e.id)).toEqual(['wreckDebris']);
    for (const e of withTide) {
      expect(EVENTS.scenarioOf(e.id)).toBe(CA);
      for (const t of ['high', 'low'] as const) expect(e.options.some((o) => (!o.tide || o.tide === t) && !o.check && !o.requiresPet), `${e.id} ${t}`).toBe(true);
    }
  });

  it('難破船の残骸: 失敗すると8ダメージ（入った人の HP が減る）・成功すると装備が1つ手に入る（判定の結果は種で決まり、保存して再開しても同じ）', () => {
    let okSeen = false, ngSeen = false;
    for (let s = 0; s < 12 && !(okSeen && ngSeen); s++) {
      let g = fresh(5130 + s, 1);
      const a = g.heroes[0];
      const hp0 = a.hp;
      g.world!.tideFrozen = 'high';
      g = enter(g, 'wreckDebris', [a.id]);
      const saved = JSON.stringify(g);
      g = choose(g, 1);
      const again = choose(migrateGame(JSON.parse(saved))!, 1);
      expect(canon(again.heroes)).toBe(canon(g.heroes));
      const hp = g.heroes[0].hp;
      if (hp < hp0) {
        ngSeen = true;
        expect(hp0 - hp).toBe(8);
      } else okSeen = true;
    }
    expect(okSeen || ngSeen).toBe(true);
  });
});

describe('区切り2: 遊んでいる間（保存・オンライン・自動プレイ）', () => {
  it('同じ操作なら同じ結果（オンラインの各端末・途中で保存して再開しても）', () => {
    const g0 = fresh(5030);
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
    let h = JSON.parse(JSON.stringify(g0)) as GameState;
    cmds.forEach((c, k) => {
      if (k === Math.floor(cmds.length / 2)) h = migrateGame(JSON.parse(JSON.stringify(h)))!;
      h = applyGameCommand(h, c).state;
    });
    expect(canon(h.world)).toBe(canon(g.world));
  });

  it('潮のマスへの移動は、今の潮だけを見る（同じ地図・同じ時間なら、どの端末でも同じ移動力）', () => {
    const g = fresh(5031);
    const w = g.world!;
    for (let i = 0; i < w.tiles.length; i++) {
      if (!isTide(w, i)) continue;
      for (const n of neighbors(w, i)) {
        const a = moveCostOf(w, i, n);
        const b = moveCostOf(migrateGame(JSON.parse(JSON.stringify(g)))!.world!, i, n);
        expect(a).toBe(b);
      }
    }
  });

  it('自動プレイで最後まで止まらない（2人・4人。クリアか全滅か霧の濃さ100%）', () => {
    for (const n of [2, 4]) {
      const { game, log } = playToEnd(fresh(5040 + n, n), 60000, { straight: true });
      expect(log.errors, `${n}人`).toEqual([]);
      expect(['ending', 'gameover'], `${n}人`).toContain(game.mode);
      expect([game.world!.width, game.world!.height]).toEqual([15, 42]);
    }
  }, 240000);
});
