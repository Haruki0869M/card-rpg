// ===== シナリオ2の作り直し 区切り2（docs/tasks/scenario2-rework-plan.md §2-1・§8）: 広い地図・3つの道・温泉・湖の氷 =====
// シナリオ1の wideMap.test.ts・threeRoads.test.ts と同じ見方で、シナリオ2「凍てつく王国」の 15×42 の地図を確かめる。
// 古い保存（前の 8×35）は scenario2OldSave.test.ts。シナリオ1の動きが変わらない事は scenario2Engine.test.ts の指紋
import { writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { getScenario } from '../../data/scenarios';
import { SANCTUARIES, TERRAINS } from '../../data/world';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { actorOf, setLocalPlayers } from '../../store/battleConfig';
import { applyGameCommand, createGame, createRng, migrateGame, validateGame } from '../index';
import { botNextCommand, playToEnd } from '../bot';
import { applyClimate, climateAt, isWarm, warmthNote } from '../game/world/climate';
import { heroMaxHp } from '../game/hero';
import { colOf, hexDistance, idxOf, linePath, neighborInDir, neighbors, rowOf } from '../game/world/hex';
import { isWideMap, laneOfCol, laneOfTile, terrainDiceBonus } from '../game/world/lanes';
import { herbEventOf } from '../game/world/generate';
import { startTileOf } from '../game/world/start';
import { moveWanderers, wandererLevel } from '../game/world/wanderers';
import { aliveScourges, scourgeLanes, scourgesFor } from '../game/world/scourges';
import { lastTurnOfDay, timeOfDay } from '../game/world/time';
import { RARITIES } from '../game/dungeon';

afterEach(() => setLocalPlayers(null));
const FK = 'frozenKingdom';
const def = () => getScenario(FK).map!;
const HOT = 'hotSpring';
const CLASSES = ['warrior', 'priest', 'mage', 'thief'];
const fresh = (seed = 1, n = 2, onePlayer = false) =>
  createGame({ seed, scenarioId: FK, difficulty: 'normal', party: Array.from({ length: n }, (_, i) => ({ classId: CLASSES[i % 4], gender: 'male' as const, name: `仲間${i}`, playerId: (onePlayer ? 'P1' : `P${i + 1}`) as PlayerId })) });
const land = (g: GameState, i: number) => {
  const t = TERRAINS.get(g.world!.tiles[i].t);
  return t.moveCost > 0 && !t.sea;
};
function walk(g: GameState): Set<number> {
  const w = g.world!;
  const start = startTileOf(g, w);
  const seen = new Set([start]);
  const q = [start];
  for (let k = 0; k < q.length; k++) for (const n of neighbors(w, q[k])) if (!seen.has(n) && land(g, n)) { seen.add(n); q.push(n); }
  return seen;
}
const featureTiles = (g: GameState, kind: string) => g.world!.tiles.flatMap((t, i) => (t.f?.kind === kind ? [i] : []));
const lane = (g: GameState, i: number) => laneOfCol(def(), colOf(g.world!, i))?.id;
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

/** 地図の文字の絵（見直し用。MAP_DUMP=ファイル名 の時だけ書く） */
function dump(g: GameState): string {
  const w = g.world!;
  const ch: Record<string, string> = { road: '=', plains: '.', forest: 'f', hills: 'h', mountain: 'M', water: '~', crag: '#', snow: ',', ice: 'i', lakeIce: '_' };
  const fc: Record<string, string> = { town: 'T', dungeon: 'D', shrine: 'S', chest: 'C', event: 'E', landmark: 'R', tower: 'W', temple: 'P', altar: 'A' };
  const lines: string[] = [];
  for (let r = 0; r < w.height; r++) {
    let s = (r % 2 ? ' ' : '') + String(r).padStart(2, '0') + ' ';
    for (let c = 0; c < w.width; c++) {
      const i = idxOf(w, c, r);
      const t = w.tiles[i];
      const e = w.wanderers.some((x) => x.tile === i);
      const f = t.f ? (t.f.id === HOT ? 'O' : t.f.kind === 'dungeon' && DUNGEONS.get(t.f.id).random ? 'Q' : fc[t.f.kind] ?? '?') : undefined;
      s += (f ?? (e ? 'x' : ch[t.t] ?? '?')) + ' ';
    }
    lines.push(s);
  }
  return lines.join('\n');
}

describe('区切り2: シナリオ2の広い地図の形', () => {
  it('15列×42行。スタートは真ん中の下 [7,40] の灯火の村。町は4つとも中央の帯の街道の上。地域は5つ・前の並びと id のまま', () => {
    const g = fresh();
    const w = g.world!;
    if (process.env.MAP_DUMP) writeFileSync(process.env.MAP_DUMP, [1, 2, 3].map((s) => dump(fresh(s))).join('\n\n'));
    expect([w.width, w.height]).toEqual([15, 42]);
    expect(isWideMap(g, w)).toBe(true);
    const start = startTileOf(g, w);
    expect(start).toBe(idxOf(w, 7, 40));
    expect(w.tiles[start].f).toEqual({ kind: 'town', id: 'lampVillage' });
    const towns = featureTiles(g, 'town');
    expect(towns).toHaveLength(4);
    for (const i of towns) {
      expect(w.tiles[i].t).toBe('road');
      expect(lane(g, i)).toBe('center');
    }
    expect(def().regions.map((r) => r.id)).toEqual(['iceCastleWaste', 'blizzardRange', 'frozenLake', 'birchSnowForest', 'thawFoothills']);
    expect(def().regions.map((r) => r.rows)).toEqual([[0, 2], [3, 11], [12, 24], [25, 33], [34, 41]]);
    // 町・ダンジョン・歌碑・ランダムダンジョンの id は前のまま
    expect(def().features.map((f) => f.id).sort()).toEqual(['crystalCave', 'fortressTown', 'firewoodPost', 'giantMine', 'iceCastle', 'lakeVillage', 'lampVillage', 'songStone', 'sunkenCathedral'].sort());
    expect(def().regions.flatMap((r) => r.randomDungeons ?? [])).toEqual(['frozenCave', 'frozenCave']);
  });

  it('種100個: 街道の骨格（灯火の村 → 薪の宿場町 → 湖畔の漁村 → 山麓の砦 → 氷の城）が、道のマスだけでつながっている', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      const pts = def().highway!.map(([c, r]) => idxOf(w, c, r));
      const seen = new Set([pts[0]]);
      const q = [pts[0]];
      for (let k = 0; k < q.length; k++) for (const n of neighbors(w, q[k])) if (!seen.has(n) && (w.tiles[n].t === 'road' || pts.includes(n))) { seen.add(n); q.push(n); }
      for (const p of pts) expect(seen.has(p), `seed ${seed} ${colOf(w, p)},${rowOf(w, p)}`).toBe(true);
    }
  });

  it('鍵のダンジョンは東・西・東、街道から3〜5マス外れた脇道の先（湖の聖堂は西の湖・巨人の鉱山は東の尾根）', () => {
    const g = fresh();
    const w = g.world!;
    const line = [...highwayLine(g)];
    const at = (id: string) => w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === id);
    const ids = ['crystalCave', 'sunkenCathedral', 'giantMine'];
    expect(ids.map((id) => lane(g, at(id)))).toEqual(['east', 'west', 'east']);
    for (const id of ids) {
      const near = Math.min(...line.map((p) => hexDistance(w, p, at(id))));
      expect(near, id).toBeGreaterThanOrEqual(3);
      expect(near, id).toBeLessThanOrEqual(5);
    }
  });

  it('種100個: 固定の施設・寄り道の中身・全部の帯に、スタートから歩いて行ける（歩いて行けない物を作らない）', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      const ok = walk(g);
      const msg = `seed ${seed}`;
      for (const f of def().features) expect(ok.has(idxOf(w, f.at[0], f.at[1])), `${msg} ${f.id}`).toBe(true);
      for (const p of def().pockets!) expect(ok.has(idxOf(w, p.at[0], p.at[1])), `${msg} 寄り道 ${p.at}`).toBe(true);
      w.tiles.forEach((t, i) => {
        if (t.f) expect(ok.has(i), `${msg} ${t.f.kind}:${t.f.id} at ${colOf(w, i)},${rowOf(w, i)}`).toBe(true);
      });
      for (const wd of w.wanderers) expect(ok.has(wd.tile), `${msg} 敵`).toBe(true);
      for (const reg of def().regions) for (const ln of def().lanes!) {
        const any = [...ok].some((i) => rowOf(w, i) >= reg.rows[0] && rowOf(w, i) <= reg.rows[1] && lane(g, i) === ln.id);
        expect(any, `${msg} ${reg.id}/${ln.id}`).toBe(true);
      }
    }
  }, 60000);

  it('盆地（山脈の東）は入口1つ・半島（西の湖）は首の1本道。中には良い宝箱（装飾箱以上）', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      for (const p of def().pockets!) {
        const at = idxOf(w, p.at[0], p.at[1]);
        const f = w.tiles[at].f!;
        expect(f.kind).toBe('chest');
        expect(['epic', 'legend']).toContain(f.chest!.rarity);
        const ways = neighbors(w, at).filter((n) => land(g, n));
        expect(ways, `seed ${seed} ${p.at}`).toEqual([neighborInDir(w, at, p.open)]);
        if (p.kind === 'peninsula') {
          const neck = neighborInDir(w, at, p.open)!;
          expect(neighbors(w, neck).filter((n) => land(g, n)).sort(), `seed ${seed} 首`).toEqual([at, neighborInDir(w, neck, p.open)!].sort());
        }
      }
      expect(lane(g, idxOf(w, 12, 6))).toBe('east');
      expect(w.tiles[idxOf(w, 12, 6)].r).toBe(1);
      expect(lane(g, idxOf(w, 1, 20))).toBe('west');
      expect(w.tiles[idxOf(w, 1, 20)].r).toBe(2);
    }
  });

  it('仕切り: 西と中央の間は湖の水・中央と東の間は険しい山。地域ごとに切れ目が2つ以上。湖の地域の西の切れ目は「湖の氷」（氷の橋）', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      for (const b of def().barriers!) {
        expect(b.terrain).toBe(b.even === 5 ? 'water' : 'crag');
        let open = 0, wall = 0;
        for (let r = b.rows[0]; r <= b.rows[1]; r++) {
          const i = idxOf(w, r % 2 ? b.odd : b.even, r);
          if (land(g, i)) {
            open++;
            // 湖の地域の西の仕切りの切れ目（道のマスを除く）は湖の氷
            if (b.even === 5 && w.tiles[i].r === 2 && w.tiles[i].t !== 'road' && !w.tiles[i].f) expect(w.tiles[i].t, `seed ${seed} row ${r}`).toBe('lakeIce');
          } else {
            wall++;
            expect(w.tiles[i].t).toBe(b.terrain);
          }
        }
        expect(open, `seed ${seed} ${b.rows}`).toBeGreaterThanOrEqual(b.gaps);
        expect(wall, `seed ${seed} ${b.rows}`).toBeGreaterThanOrEqual(b.rows[1] - b.rows[0] + 1 - b.gaps - 2);
      }
    }
  });

  it('物の数: 宝箱18（盆地・半島の2つを含む）・イベント18（温泉1は東）・祠8（西に無い）・塔4（西2・東2）・ランダムダンジョンは西と東に1つずつ（テーマ別々）・神殿・祭壇・敵36組', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = fresh(seed, 1);
      const w = g.world!;
      const msg = `seed ${seed}`;
      expect(featureTiles(g, 'chest'), msg).toHaveLength(18);
      const events = featureTiles(g, 'event').filter((i) => !EVENTS.get(w.tiles[i].f!.id).hiddenIn);
      expect(events, msg).toHaveLength(18);
      const hot = events.filter((i) => w.tiles[i].f!.id === HOT);
      expect(hot, msg).toHaveLength(1);
      for (const i of hot) {
        expect(lane(g, i), msg).toBe('east');
        expect(w.tiles[i].r, msg).toBe(2);
      }
      // 薬草の群生地は置かない（回復のマスは温泉）
      expect(events.filter((i) => w.tiles[i].f!.id === 'herbField'), msg).toHaveLength(0);
      const shrines = featureTiles(g, 'shrine');
      expect(shrines, msg).toHaveLength(8);
      for (const i of shrines) expect(lane(g, i), msg).not.toBe('west');
      expect(featureTiles(g, 'tower').map((i) => lane(g, i)).sort(), msg).toEqual(['east', 'east', 'west', 'west']);
      const rd = featureTiles(g, 'dungeon').filter((i) => DUNGEONS.get(w.tiles[i].f!.id).random);
      expect(rd.map((i) => lane(g, i)).sort(), msg).toEqual(['east', 'west']);
      expect(new Set(rd.map((i) => w.tiles[i].f!.theme)).size, msg).toBe(2);
      expect(featureTiles(g, 'temple'), msg).toHaveLength(SANCTUARIES.forScenario(FK).filter((s) => s.kind === 'temple').length);
      expect(featureTiles(g, 'altar'), msg).toHaveLength(SANCTUARIES.forScenario(FK).filter((s) => s.kind === 'altar').length);
      expect(w.wanderers.length, msg).toBeGreaterThanOrEqual(34);
      expect(w.wanderers.length, msg).toBeLessThanOrEqual(36);
    }
  });

  it('同じ種なら同じ地図（オンライン・保存して再開でも同じ）', () => {
    expect(JSON.stringify(fresh(7).world)).toBe(JSON.stringify(fresh(7).world));
  });
});

describe('区切り2: 3つの道の違い（帯ごと）', () => {
  const SEEDS = Array.from({ length: 30 }, (_, k) => 4001 + k);

  it('帯のデータ（計画 §2-1 の表の数字）: 寒さ ×2 / ×0.5 / ×1・敵の重み ×0.5 / ×2.2 / ×1・東は Lv+1 と宝箱の段2・印と説明', () => {
    const by = Object.fromEntries(def().lanes!.map((l) => [l.id, l]));
    expect(by.west).toMatchObject({ name: '凍った湖の近道', climate: 2, spawnWeight: 0.5, noShrine: true });
    expect(by.center).toMatchObject({ name: '薪の街道', climate: 0.5, spawnWeight: 2.2 });
    expect(by.east).toMatchObject({ name: '巨人の尾根', enemyLevel: 1, chestDepth: 2 });
    expect(by.east.climate ?? 1).toBe(1);
    expect(by.east.spawnWeight ?? 1).toBe(1);
    for (const l of def().lanes!) expect(l.mark && l.hint && l.tag, l.id).toBeTruthy();
    expect(def().prefer).toMatchObject({ herb: 'east', chest: 'east', altar: 'east', shrine: 'east', randomDungeon: ['west', 'east'] });
    expect(herbEventOf(def())).toBe(HOT);
    // 災厄は街道の帯でない西と東に置く
    expect([...scourgeLanes(def())].sort()).toEqual(['east', 'west']);
  });

  it('地形: 西は湖の氷が多い（陸の半分以上）・中央と東はほとんど無い。東は山・丘・森が多い（遅い）', () => {
    const cnt: Record<string, Record<string, number>> = { west: {}, center: {}, east: {} };
    for (const s of SEEDS.slice(0, 10)) {
      const g = fresh(s, 1);
      const w = g.world!;
      w.tiles.forEach((t, i) => {
        if (t.r === 0 || t.r === 4 || t.f || !land(g, i)) return; // 真ん中の3地域（寒い・帯の地形がある所）
        const c = cnt[lane(g, i)!];
        c[t.t] = (c[t.t] ?? 0) + 1;
      });
    }
    const share = (ln: string, ids: string[]) => ids.reduce((n, id) => n + (cnt[ln][id] ?? 0), 0) / Object.values(cnt[ln]).reduce((a, b) => a + b, 0);
    expect(share('west', ['lakeIce'])).toBeGreaterThan(0.5);
    expect(share('center', ['lakeIce'])).toBeLessThan(0.05);
    expect(share('east', ['lakeIce'])).toBeLessThan(0.05);
    expect(share('east', ['mountain', 'hills', 'forest'])).toBeGreaterThan(0.6);
    expect(share('east', ['mountain', 'hills', 'forest'])).toBeGreaterThan(share('center', ['mountain', 'hills', 'forest']) * 2);
  });

  it('敵: 中央の街道に多く、西の湖に少ない（マスの広さあたり）。敵の総数は地域の数のまま。東の尾根の敵は Lv+1', () => {
    const per: Record<string, number> = { west: 0, center: 0, east: 0 };
    const area: Record<string, number> = { west: 0, center: 0, east: 0 };
    for (const s of SEEDS) {
      const g = fresh(s, 1);
      const w = g.world!;
      expect(w.wanderers.length).toBe(def().regions.reduce((n, r) => n + r.wanderers, 0));
      for (const wd of w.wanderers) {
        per[laneOfTile(g, w, wd.tile)!]++;
        const add = lane(g, wd.tile) === 'east' ? 1 : 0;
        expect(wd.enemies[0].level).toBe(wandererLevel(g, w, w.tiles[wd.tile].r) + add);
      }
      w.tiles.forEach((t, i) => {
        if (!t.f && land(g, i)) area[lane(g, i)!]++;
      });
    }
    const dens = (k: string) => per[k] / area[k];
    expect(dens('center')).toBeGreaterThan(dens('east') * 1.5);
    expect(dens('east')).toBeGreaterThan(dens('west') * 1.3);
  });

  it('徘徊する敵は帯をまたいで動かない', () => {
    const g = fresh(4005);
    const w = structuredClone(g.world!);
    const lane0 = new Map(w.wanderers.map((x) => [x.id, laneOfTile(g, w, x.tile)]));
    const rng = createRng(77);
    for (let t = 0; t < 200; t++) {
      w.worldTurn++;
      moveWanderers(w, rng, g);
      for (const x of w.wanderers) expect(laneOfTile(g, w, x.tile)).toBe(lane0.get(x.id));
    }
  });

  it('宝箱: 東の尾根に多く、東の宝箱は良い（盆地・半島の分を除いても）', () => {
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

  it('寒さ: 同じ雪原でも、西は ×2・中央は ×0.5・東は ×1。麓のスタートは暖かい', () => {
    const g = fresh(4002);
    const w = g.world!;
    expect(climateAt(g, startTileOf(g, w))).toBeUndefined();
    const at = (ln: string) => w.tiles.findIndex((t, i) => t.r >= 1 && t.r <= 3 && !t.f && t.t === 'snow' && lane(g, i) === ln);
    const base = BALANCE.climateDamageRatio;
    expect(climateAt(g, at('west'))).toEqual({ kind: 'cold', ratio: base * 2 });
    expect(climateAt(g, at('center'))).toEqual({ kind: 'cold', ratio: base * 0.5 });
    expect(climateAt(g, at('east'))).toEqual({ kind: 'cold' });
    // 湖の氷も寒い（西なら ×2）
    const ice = w.tiles.findIndex((t, i) => !t.f && t.t === 'lakeIce' && lane(g, i) === 'west');
    expect(climateAt(g, ice)).toEqual({ kind: 'cold', ratio: base * 2 });
  });
});

describe('区切り2: 湖の氷は移動 +2（街道は +1 のまま）', () => {
  it('湖の氷のマスでサイコロを振ると「湖の氷 +2」。街道は「街道 +1」。ほかの地形は何も付かない', () => {
    let g = fresh(3);
    g.world!.story = undefined;
    const w = g.world!;
    const h = g.heroes[0];
    expect(TERRAINS.get('lakeIce').moveDiceBonus).toBe(2);
    expect(TERRAINS.get('road').moveDiceBonus).toBe(1);
    const ice = w.tiles.findIndex((t) => t.t === 'lakeIce' && !t.f);
    expect(terrainDiceBonus(g, w, ice)).toEqual([{ label: '湖の氷', value: 2 }]);
    expect(terrainDiceBonus(g, w, w.pos[h.id])).toEqual([{ label: '街道', value: 1 }]);
    expect(terrainDiceBonus(g, w, w.tiles.findIndex((t) => t.t === 'snow'))).toEqual([]);
    // 実際に湖の氷の上で振る
    w.pos[h.id] = ice;
    w.pos[g.heroes[1].id] = ice;
    w.prevTile = ice;
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: h.playerId, heroId: h.id });
    const d = g.world!.moveDice!;
    expect(d.bonus).toContainEqual({ label: '湖の氷', value: 2 });
    expect(d.total).toBe(d.face + d.bonus.reduce((n, b) => n + b.value, 0));
  });

  it('シナリオ1の地図には湖の氷が無い（シナリオ1の移動は変わらない）', () => {
    for (const r of getScenario('corruptionKing').map!.regions) expect(r.terrain.lakeIce, r.id).toBeUndefined();
  });
});

describe('区切り2: 温泉（全員のHP回復＋次の朝まで寒さを受けない）', () => {
  /** 温泉のマスに、手番のキャラ（と仲間）を立たせて入る */
  function enterSpring(g: GameState, heroIds: string[], turnHero = heroIds[0]): GameState {
    const w = g.world!;
    w.story = undefined;
    const tile = w.tiles.findIndex((t) => t.f?.kind === 'event' && t.f.id === HOT);
    expect(tile).toBeGreaterThanOrEqual(0);
    for (const id of heroIds) w.pos[id] = tile;
    w.turn = turnHero;
    w.move = null;
    const h = g.heroes.find((x) => x.id === turnHero)!;
    return run(g, { type: 'WORLD_INTERACT', playerId: h.playerId, heroId: h.id });
  }

  it('イベントのデータ: 地図に置く物（placed）・世界マップ・HP+20 は薬草の群生地の回復薬と同じ数字', () => {
    const ev = EVENTS.get(HOT);
    expect(ev.where).toBe('map');
    expect(ev.placed).toBe(true);
    expect(EVENTS.scenarioOf(HOT)).toBe(FK);
    expect(ev.options[0].success).toEqual([{ kind: 'heal', amount: 20, all: true }, { kind: 'warmth', all: true }]);
  });

  it('入ると全員のHPが20回復し、その日の夜の最後のターンまで寒さを受けない。次の朝から元に戻る', () => {
    let g = fresh(4010, 2, true);
    const [a, b] = g.heroes;
    for (const h of g.heroes) h.hp = Math.max(1, heroMaxHp(h) - 30);
    const hp0 = g.heroes.map((h) => h.hp);
    g = enterSpring(g, [a.id, b.id]);
    expect(g.mode).toBe('event');
    g = run(g, { type: 'CHOOSE_EVENT', playerId: a.playerId, optionIndex: 0, focusUsed: 0 });
    g = run(g, { type: 'FINISH_EVENT', playerId: a.playerId });
    expect(g.mode).toBe('world');
    g.heroes.forEach((h, k) => expect(h.hp).toBe(Math.min(heroMaxHp(h), hp0[k] + 20)));
    const w = g.world!;
    const until = lastTurnOfDay(w.worldTurn);
    expect(w.warm).toEqual({ [a.id]: until, [b.id]: until });
    expect(isWarm(w, a.id)).toBe(true);
    expect(warmthNote(g, a.id)).toContain('温泉');
    // 寒いマスに立って、ターンの終わりを迎えても減らない（夜の最後のターンまで）
    const cold = w.tiles.findIndex((t, i) => !t.f && t.t === 'snow' && lane(g, i) === 'west');
    w.pos[a.id] = cold;
    w.pos[b.id] = cold;
    while (w.worldTurn <= until) {
      const before = g.heroes.map((h) => h.hp);
      applyClimate(g);
      expect(g.heroes.map((h) => h.hp)).toEqual(before);
      w.worldTurn++;
    }
    // 次の朝: 印は消え、寒さを受ける
    expect(timeOfDay(w.worldTurn)).toBe('morning');
    expect(w.warm).toBeUndefined();
    expect(isWarm(w, a.id)).toBe(false);
    expect(warmthNote(g, a.id)).toBeUndefined();
    const hpA = g.heroes[0].hp;
    applyClimate(g);
    expect(g.heroes[0].hp).toBeLessThan(hpA);
  });

  it('入っていない仲間は寒さを受ける（温まるのは入ったキャラだけ）', () => {
    let g = fresh(4011);
    const [a, b] = g.heroes;
    g = enterSpring(g, [a.id]);
    g = run(g, { type: 'CHOOSE_EVENT', playerId: a.playerId, optionIndex: 0, focusUsed: 0 });
    g = run(g, { type: 'FINISH_EVENT', playerId: a.playerId });
    const w = g.world!;
    expect(Object.keys(w.warm!)).toEqual([a.id]);
    const cold = w.tiles.findIndex((t, i) => !t.f && t.t === 'snow' && lane(g, i) === 'east');
    w.pos[a.id] = cold;
    w.pos[b.id] = cold;
    const [ha, hb] = [g.heroes[0].hp, g.heroes[1].hp];
    applyClimate(g);
    expect(g.heroes[0].hp).toBe(ha);
    expect(g.heroes[1].hp).toBeLessThan(hb);
  });

  it('「先を急ぐ」では何も起きない（印も付かない）', () => {
    let g = fresh(4012);
    g = enterSpring(g, [g.heroes[0].id]);
    g = run(g, { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 1, focusUsed: 0 });
    g = run(g, { type: 'FINISH_EVENT', playerId: 'P1' });
    expect(g.world!.warm).toBeUndefined();
  });

  it('2人で1台: P2 の番に温泉へ入っても、選ぶ・閉じる操作は P2 の操作として送られて止まらない', () => {
    setLocalPlayers(['P1', 'P2']);
    let g = fresh(4013);
    const b = g.heroes[1];
    g = enterSpring(g, [b.id], b.id);
    const choose: GameCommand = { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 0, focusUsed: 0 };
    expect(actorOf(g, choose)).toBe('P2');
    g = run(g, { ...choose, playerId: actorOf(g, choose) } as GameCommand);
    const fin: GameCommand = { type: 'FINISH_EVENT', playerId: 'P1' };
    expect(actorOf(g, fin)).toBe('P2');
    g = run(g, { ...fin, playerId: actorOf(g, fin) } as GameCommand);
    expect(g.mode).toBe('world');
    expect(isWarm(g.world!, b.id)).toBe(true);
  });

  it('保存して読み直し（JSON）ても同じ結果: 印が残り、寒さの処理も同じ', () => {
    let g = fresh(4014);
    g = enterSpring(g, [g.heroes[0].id, g.heroes[1].id]);
    g = run(g, { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 0, focusUsed: 0 });
    g = run(g, { type: 'FINISH_EVENT', playerId: 'P1' });
    const m = migrateGame(JSON.parse(JSON.stringify(g)))!;
    expect(validateGame(m)).toBe(true);
    expect(m.world!.warm).toEqual(g.world!.warm);
    for (const s of [g, m]) {
      const w = s.world!;
      const cold = w.tiles.findIndex((t, i) => !t.f && t.t === 'snow' && lane(s, i) === 'west');
      for (const h of s.heroes) w.pos[h.id] = cold;
      w.worldTurn = lastTurnOfDay(w.worldTurn) + 1;
      applyClimate(s);
    }
    expect(canon(m.world)).toBe(canon(g.world));
    expect(canon(m.heroes)).toBe(canon(g.heroes));
  });
});

describe('区切り2: 災厄（このシナリオの3体は次の区切り。今は氷嵐の魔女だけ）', () => {
  it('出る候補は氷嵐の魔女だけ。節目を全部越えても1体だけで、ワールドターンは止まらずに進む', () => {
    expect(scourgesFor(FK).map((d) => d.id)).toEqual(['stormWitch']);
    // 魔女の専用の装備を使えるキャラがいるパーティ（いなければ0体）
    let g = createGame({ seed: 4020, scenarioId: FK, difficulty: 'normal', party: ['mage', 'warrior'].map((classId, i) => ({ classId, gender: 'male' as const, name: `h${i}`, playerId: `P${i + 1}` as PlayerId })) });
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    expect(g.world!.scourgeCount).toBe(0);
    g.world!.keys = ['k1'];
    g.world!.corruption = 60;
    for (let t = 0; t < 8; t++) {
      const start = g.world!.worldTurn;
      for (let k = 0; k < 10 && g.world!.worldTurn === start && g.mode === 'world'; k++) {
        if (g.world!.story) g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
        const h = g.heroes.find((x) => x.id === g.world!.turn)!;
        g = run(g, { type: 'WORLD_WAIT', playerId: h.playerId, heroId: h.id });
      }
      expect(g.world!.worldTurn, `turn ${t}`).toBe(start + 1);
    }
    const alive = aliveScourges(g.world).map((x) => x.def.id);
    expect(alive.length).toBeLessThanOrEqual(1);
    for (const id of alive) expect(id).toBe('stormWitch');
    expect(g.world!.scourgesMet!.every((id) => id === 'stormWitch')).toBe(true);
  });
});

describe('区切り2: 遊んでいる間（保存・オンライン・自動プレイ）', () => {
  it('同じ操作なら同じ結果（オンラインの各端末・途中で保存して再開しても）', () => {
    const g0 = fresh(4030);
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
    // 中身で比べる（保存して読み直すと、後から足される欄（storyVer など）の並び順だけが変わる事がある。値は同じ）
    expect(canon(h.world)).toBe(canon(g.world));
  });

  it('自動プレイで最後まで止まらない（2人・4人。クリアか全滅か冬の深さ100%）', () => {
    for (const n of [2, 4]) {
      const { game, log } = playToEnd(fresh(4040 + n, n), 60000, { straight: true });
      expect(log.errors, `${n}人`).toEqual([]);
      expect(['ending', 'gameover'], `${n}人`).toContain(game.mode);
      expect([game.world!.width, game.world!.height]).toEqual([15, 42]);
    }
  }, 240000);
});
