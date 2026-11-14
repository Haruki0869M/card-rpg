// ===== 段階6a: シナリオ1の広い地図（15列×42行・3つの帯・街道・仕切り・盆地と半島・薬草）と街道ボーナス =====
// 計画: docs/tasks/overhaul-plan-v2.md §2。古い保存（前の8列×35行の地図の途中）は地図を作り直さずに遊べる
import { writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { getScenario, SCENARIOS } from '../../data/scenarios';
import { SANCTUARIES, TERRAINS } from '../../data/world';
import type { GameState, ScenarioMapDef } from '../../types';
import { actorOf, setLocalPlayers } from '../../store/battleConfig';
import { applyGameCommand, createGame, migrateGame } from '../index';
import { playToEnd } from '../bot';
import { colOf, hexDistance, idxOf, neighborInDir, neighbors, rowOf } from '../game/world/hex';
import { isWideMap, laneOfCol, nextGoalDungeon, terrainDiceBonus } from '../game/world/lanes';
import { startTileOf } from '../game/world/start';
import { HERB_EVENT } from '../game/world/generate';
import { direction8, goalLineText, guideGoal, signposts } from '../game/world/guide';

afterEach(() => setLocalPlayers(null));
const CK = 'corruptionKing';
const fresh = (seed = 1, scenarioId = CK, n = 2) =>
  createGame({ seed, scenarioId, difficulty: 'normal', party: Array.from({ length: n }, (_, i) => ({ classId: 'warrior', gender: 'male' as const, name: `仲間${i}`, playerId: `P${i + 1}` as 'P1' })) });
const def = () => getScenario(CK).map!;
const land = (g: GameState, i: number) => {
  const t = TERRAINS.get(g.world!.tiles[i].t);
  return t.moveCost > 0 && !t.sea;
};
/** スタートから陸を歩いて行けるマス */
function walk(g: GameState): Set<number> {
  const w = g.world!;
  const start = startTileOf(g, w);
  const seen = new Set([start]);
  const q = [start];
  for (let k = 0; k < q.length; k++) for (const n of neighbors(w, q[k])) if (!seen.has(n) && land(g, n)) { seen.add(n); q.push(n); }
  return seen;
}
const featureTiles = (g: GameState, kind: string) => g.world!.tiles.flatMap((t, i) => (t.f?.kind === kind ? [i] : []));

/** 地図の文字の絵（見直し用。MAP_DUMP=1 の時だけ出す） */
function dump(g: GameState): string {
  const w = g.world!;
  const ch: Record<string, string> = { road: '=', plains: '.', forest: 'f', swamp: 's', hills: 'h', mountain: 'M', ash: 'a', lava: 'L', water: '~', blight: 'b', crag: '#' };
  const fc: Record<string, string> = { town: 'T', dungeon: 'D', shrine: 'S', chest: 'C', event: 'E', landmark: 'R', tower: 'W', temple: 'P', altar: 'A' };
  const lines: string[] = [];
  for (let r = 0; r < w.height; r++) {
    let s = (r % 2 ? ' ' : '') + String(r).padStart(2, '0') + ' ';
    for (let c = 0; c < w.width; c++) {
      const t = w.tiles[idxOf(w, c, r)];
      const e = w.wanderers.some((x) => x.tile === idxOf(w, c, r));
      s += (t.f ? (t.f.id === HERB_EVENT ? 'H' : fc[t.f.kind] ?? '?') : e ? 'x' : ch[t.t] ?? '?') + ' ';
    }
    lines.push(s);
  }
  return lines.join('\n');
}

describe('段階6a: シナリオ1の広い地図の形', () => {
  it('15列×42行。スタートは真ん中の下 [7,40] の王都。町は4つとも中央の帯の街道の上', () => {
    const g = fresh();
    const w = g.world!;
    if (process.env.MAP_DUMP) writeFileSync(process.env.MAP_DUMP, [1, 2, 3].map((s) => dump(fresh(s))).join('\n\n'));
    expect([w.width, w.height]).toEqual([15, 42]);
    expect(isWideMap(g, w)).toBe(true);
    const start = startTileOf(g, w);
    expect(start).toBe(idxOf(w, 7, 40));
    expect(w.tiles[start].f).toEqual({ kind: 'town', id: 'royalCapital' });
    const towns = featureTiles(g, 'town');
    expect(towns).toHaveLength(4);
    for (const i of towns) {
      expect(w.tiles[i].t).toBe('road');
      expect(laneOfCol(def(), colOf(w, i))?.id).toBe('center');
    }
    // 地域の行は計画の表のとおり
    expect(def().regions.map((r) => r.rows)).toEqual([[0, 2], [3, 11], [12, 24], [25, 33], [34, 41]]);
  });

  it('街道の骨格: 王都 → 森の村 → 沼の集落 → 麓の村 → 魔王城が、道のマスだけでつながっている', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = fresh(seed);
      const w = g.world!;
      const pts = def().highway!.map(([c, r]) => idxOf(w, c, r));
      const seen = new Set([pts[0]]);
      const q = [pts[0]];
      for (let k = 0; k < q.length; k++) for (const n of neighbors(w, q[k])) if (!seen.has(n) && w.tiles[n].t === 'road' || (!seen.has(n) && pts.includes(n))) { seen.add(n); q.push(n); }
      for (const p of pts) expect(seen.has(p), `seed ${seed}`).toBe(true);
    }
  });

  it('鍵のダンジョンは西・東・西に交互、街道から3〜5マス外れた所', () => {
    const g = fresh();
    const w = g.world!;
    const road = def().highway!.map(([c, r]) => idxOf(w, c, r));
    const at = (id: string) => w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === id);
    const lanes = ['emeraldTemple', 'silentCatacomb', 'lavaCavern'].map((id) => laneOfCol(def(), colOf(w, at(id)))?.id);
    expect(lanes).toEqual(['west', 'east', 'west']);
    // 街道（骨格の点を結んだ道）からの距離: 一番近い道のマスとの距離。脇道は数えない
    for (const id of ['emeraldTemple', 'silentCatacomb', 'lavaCavern']) {
      const i = at(id);
      const near = Math.min(...road.map((p) => hexDistance(w, p, i)));
      expect(near, id).toBeGreaterThanOrEqual(3);
    }
  });

  it('種100個: 固定の施設・寄り道の中身・全部の帯に、スタートから歩いて行ける（歩いて行けない物を作らない）', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = fresh(seed);
      const w = g.world!;
      const ok = walk(g);
      const msg = `seed ${seed}`;
      for (const f of def().features) expect(ok.has(idxOf(w, f.at[0], f.at[1])), `${msg} ${f.id}`).toBe(true);
      for (const p of def().pockets!) expect(ok.has(idxOf(w, p.at[0], p.at[1])), `${msg} 寄り道 ${p.at}`).toBe(true);
      // ランダムに置いた物も全部行ける
      w.tiles.forEach((t, i) => {
        if (t.f) expect(ok.has(i), `${msg} ${t.f.kind}:${t.f.id} at ${colOf(w, i)},${rowOf(w, i)}`).toBe(true);
      });
      for (const wd of w.wanderers) expect(ok.has(wd.tile), `${msg} 敵`).toBe(true);
      // 地域 × 帯のどこにも、行けるマスがある
      for (const reg of def().regions) for (const lane of def().lanes!) {
        const any = [...ok].some((i) => rowOf(w, i) >= reg.rows[0] && rowOf(w, i) <= reg.rows[1] && laneOfCol(def(), colOf(w, i))?.id === lane.id);
        expect(any, `${msg} ${reg.id}/${lane.id}`).toBe(true);
      }
    }
  });

  it('7本 × 種100個: 固定の施設（町・ダンジョン・名所）に、スタートから行ける（海は船で渡れるものとする）', () => {
    for (const s of SCENARIOS.all.filter((x) => x.map)) {
      for (let seed = 1; seed <= 100; seed++) {
        const g = fresh(seed, s.id, 1);
        const w = g.world!;
        const start = startTileOf(g, w);
        const seen = new Set([start]);
        const q = [start];
        const pass = (i: number) => TERRAINS.get(w.tiles[i].t).moveCost > 0 || !!TERRAINS.get(w.tiles[i].t).sea;
        for (let k = 0; k < q.length; k++) for (const n of neighbors(w, q[k])) if (!seen.has(n) && pass(n)) { seen.add(n); q.push(n); }
        for (const f of s.map!.features) expect(seen.has(idxOf(w, f.at[0], f.at[1])), `${s.id} seed ${seed} ${f.id}`).toBe(true);
      }
    }
  }, 120000);

  it('盆地は入口が1つだけ（まわりの5マスは通れない山）。半島は首の1本道。中には良い宝箱（装飾箱以上）か祠', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = fresh(seed);
      const w = g.world!;
      for (const p of def().pockets!) {
        const at = idxOf(w, p.at[0], p.at[1]);
        const f = w.tiles[at].f!;
        expect(f.kind).toBe(p.content);
        if (f.kind === 'chest') expect(['epic', 'legend']).toContain(f.chest!.rarity);
        const ways = neighbors(w, at).filter((n) => land(g, n));
        expect(ways, `seed ${seed} ${p.at}`).toEqual([neighborInDir(w, at, p.open)]);
        if (p.kind === 'peninsula') {
          const neck = neighborInDir(w, at, p.open)!;
          expect(neighbors(w, neck).filter((n) => land(g, n)).sort(), `seed ${seed} 首`).toEqual([at, neighborInDir(w, neck, p.open)!].sort());
        }
      }
    }
  });

  it('仕切り: 帯の間の壁は通れない地形で、地域ごとに切れ目が2つ以上（道が横切る所も通れる）', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = fresh(seed);
      const w = g.world!;
      for (const b of def().barriers!) {
        let open = 0, wall = 0;
        for (let r = b.rows[0]; r <= b.rows[1]; r++) {
          const i = idxOf(w, r % 2 ? b.odd : b.even, r);
          if (land(g, i)) open++;
          else wall++;
        }
        expect(open, `seed ${seed} ${b.rows}`).toBeGreaterThanOrEqual(b.gaps);
        expect(wall, `seed ${seed} ${b.rows}`).toBeGreaterThanOrEqual(b.rows[1] - b.rows[0] + 1 - b.gaps - 2);
      }
    }
  });

  it('物の数（計画 §2-2 の表）: 宝箱18・イベント18（薬草3は西）・祠8・塔4（西2・東2）・町4・ランダムダンジョンは西と東に1つずつ（段階7a）・神殿2・祭壇5', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = fresh(seed);
      const w = g.world!;
      const msg = `seed ${seed}`;
      const lane = (i: number) => laneOfCol(def(), colOf(w, i))?.id;
      expect(featureTiles(g, 'chest'), msg).toHaveLength(18);
      const events = featureTiles(g, 'event').filter((i) => !EVENTS.get(w.tiles[i].f!.id).hiddenIn);
      expect(events, msg).toHaveLength(18);
      const herbs = events.filter((i) => w.tiles[i].f!.id === HERB_EVENT);
      expect(herbs, msg).toHaveLength(3);
      for (const i of herbs) expect(lane(i)).toBe('west');
      expect(featureTiles(g, 'shrine'), msg).toHaveLength(8);
      const tw = featureTiles(g, 'tower');
      expect(tw.map(lane).sort(), msg).toEqual(['east', 'east', 'west', 'west']);
      const rd = featureTiles(g, 'dungeon').filter((i) => DUNGEONS.get(w.tiles[i].f!.id).random);
      expect(rd.map(lane).sort(), msg).toEqual(['east', 'west']);
      // 2か所のテーマは別々（段階7a）
      expect(new Set(rd.map((i) => w.tiles[i].f!.theme)).size, msg).toBe(2);
      expect(featureTiles(g, 'temple'), msg).toHaveLength(SANCTUARIES.forScenario(CK).filter((s) => s.kind === 'temple').length);
      expect(featureTiles(g, 'altar'), msg).toHaveLength(SANCTUARIES.forScenario(CK).filter((s) => s.kind === 'altar').length);
      // 徘徊する敵は36組（置けるマスが無い時だけ少なくなる）
      expect(w.wanderers.length, msg).toBeGreaterThanOrEqual(34);
      expect(w.wanderers.length, msg).toBeLessThanOrEqual(36);
    }
  });

  it('祠は西の帯に多い（全部ではない）。祭壇は東の帯を優先する', () => {
    let west = 0, all = 0, eastAltars = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const g = fresh(seed);
      const w = g.world!;
      for (const i of featureTiles(g, 'shrine')) {
        all++;
        if (laneOfCol(def(), colOf(w, i))?.id === 'west') west++;
      }
      eastAltars += featureTiles(g, 'altar').filter((i) => laneOfCol(def(), colOf(w, i))?.id === 'east').length;
    }
    expect(west / all).toBeGreaterThan(0.6);
    expect(eastAltars).toBeGreaterThan(0);
  });

  it('同じ種なら同じ地図（オンライン・保存して再開でも同じ）', () => {
    expect(JSON.stringify(fresh(7).world!.tiles)).toBe(JSON.stringify(fresh(7).world!.tiles));
  });

  it('ほかの6本は前の地図のまま（帯が無い・幅も変わらない）', () => {
    for (const s of SCENARIOS.all.filter((x) => x.id !== CK && x.map)) {
      const g = fresh(1, s.id);
      expect(s.map!.lanes, s.id).toBeUndefined();
      expect(g.world!.width, s.id).toBe(s.map!.width);
      expect(isWideMap(g, g.world!), s.id).toBe(false);
    }
  });
});

describe('段階6a: 街道ボーナス', () => {
  it('街道のマスでサイコロを振ると「＋1（街道）」。道でないマスでは付かない', () => {
    let g = fresh(3);
    g.world!.story = undefined;
    const w = g.world!;
    const h = g.heroes[0];
    expect(w.tiles[w.pos[h.id]].t).toBe('road');
    const r = applyGameCommand(g, { type: 'WORLD_ROLL_MOVE', playerId: h.playerId, heroId: h.id });
    expect(r.error).toBeUndefined();
    g = r.state;
    const d = g.world!.moveDice!;
    expect(d.bonus).toContainEqual({ label: '街道', value: 1 });
    expect(d.total).toBe(d.face + d.bonus.reduce((n, b) => n + b.value, 0));
    // 振り直しても付いたまま
    g.heroes[0].focus = 3;
    const r2 = applyGameCommand(g, { type: 'WORLD_REROLL_MOVE', playerId: h.playerId, heroId: h.id });
    expect(r2.error).toBeUndefined();
    expect(r2.state.world!.moveDice!.bonus).toContainEqual({ label: '街道', value: 1 });
    // 平原のマス
    const plain = w.tiles.findIndex((t) => t.t === 'plains');
    expect(terrainDiceBonus(g, g.world!, plain)).toEqual([]);
    expect(terrainDiceBonus(g, g.world!, w.pos[h.id])).toEqual([{ label: '街道', value: 1 }]);
  });

  it('1台で遊ぶ時、P2 の番のサイコロも P2 の操作として送られる（新しい操作は無い）', () => {
    setLocalPlayers(['P1', 'P2']);
    const g = fresh(3);
    g.world!.story = undefined;
    g.world!.turn = 'h1';
    expect(actorOf(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h1' })).toBe('P2');
  });
});

describe('段階6a: 次の目的地（見取り図で光らせる）', () => {
  it('鍵の扉が開く順: 翠の神殿 → 静寂の地下墓地 → 溶岩の大空洞 → 魔王城', () => {
    const g = fresh();
    expect(nextGoalDungeon(g)).toBe('emeraldTemple');
    g.clearedDungeons.push('emeraldTemple');
    g.world!.keys.push('emerald');
    expect(nextGoalDungeon(g)).toBe('silentCatacomb');
    g.clearedDungeons.push('silentCatacomb');
    g.world!.keys.push('azure');
    expect(nextGoalDungeon(g)).toBe('lavaCavern');
    g.clearedDungeons.push('lavaCavern');
    g.world!.keys.push('crimson');
    expect(nextGoalDungeon(g)).toBe('demonCastle');
  });
});

/** 段階6a の前のシナリオ1の地図（8列×35行）。古い保存を作るためだけに使う */
const OLD_MAP: Partial<ScenarioMapDef> = {
  width: 8,
  height: 35,
  start: [3, 33],
  lanes: undefined,
  highway: undefined,
  barriers: undefined,
  pockets: undefined,
  prefer: undefined,
  features: [
    { kind: 'town', id: 'royalCapital', at: [3, 33] },
    { kind: 'town', id: 'forestVillage', at: [5, 25] },
    { kind: 'town', id: 'swampHamlet', at: [2, 16] },
    { kind: 'town', id: 'foothillVillage', at: [5, 9] },
    { kind: 'dungeon', id: 'emeraldTemple', at: [2, 22] },
    { kind: 'dungeon', id: 'silentCatacomb', at: [5, 13] },
    { kind: 'dungeon', id: 'lavaCavern', at: [2, 3] },
    { kind: 'dungeon', id: 'demonCastle', at: [4, 0] },
    { kind: 'landmark', id: 'oldRuins', at: [0, 28] },
  ],
};
const OLD_ROWS: [number, number][] = [[0, 2], [3, 9], [10, 20], [21, 27], [28, 34]];
const OLD_COUNTS = [{ wanderers: 2 }, { wanderers: 4, chests: 3, events: 3, shrines: 1 }, { wanderers: 7, chests: 3, events: 3, shrines: 1 }, { wanderers: 4, chests: 3, events: 3, shrines: 1 }, { wanderers: 4, chests: 2, events: 2, shrines: 2 }];

/** 前の地図で冒険を始めて、保存データ（JSON）にする。地図のデータは元に戻す */
function oldSave(seed: number, n = 2): string {
  const map = getScenario(CK).map as ScenarioMapDef;
  const keep = { ...map, regions: map.regions.map((r) => ({ ...r })) };
  try {
    Object.assign(map, OLD_MAP);
    map.regions = map.regions.map((r, k) => ({ ...r, rows: OLD_ROWS[k], herbs: undefined, chests: undefined, events: undefined, shrines: undefined, ...OLD_COUNTS[k] }));
    const g = fresh(seed, CK, n);
    expect([g.world!.width, g.world!.height]).toEqual([8, 35]);
    return JSON.stringify(g);
  } finally {
    Object.assign(map, keep);
  }
}

describe('段階6a: 古い保存（v26・前の8列×35行の地図の途中）', () => {
  it('地図は作り直さない。スタートの町が見つかる。帯・街道ボーナスは使わない（前の決まりのまま）', () => {
    const g = migrateGame(JSON.parse(oldSave(5)))!;
    expect(g).not.toBeNull();
    const w = g.world!;
    expect([w.width, w.height]).toEqual([8, 35]);
    expect(def().width).toBe(15);
    expect(isWideMap(g, w)).toBe(false);
    const start = startTileOf(g, w);
    expect(start).toBe(idxOf(w, 3, 33));
    expect(w.tiles[start].f).toEqual({ kind: 'town', id: 'royalCapital' });
    expect(terrainDiceBonus(g, w, start)).toEqual([]);
    w.story = undefined;
    const h = g.heroes[0];
    const r = applyGameCommand(g, { type: 'WORLD_ROLL_MOVE', playerId: h.playerId, heroId: h.id });
    expect(r.error).toBeUndefined();
    expect(r.state.world!.moveDice!.bonus.some((b) => b.label === '街道')).toBe(false);
  });

  it('回1: 前の地図の途中でも、次の目的の文が出る（地域の名前だけ）。立て札は無い。保存に何も足さない', () => {
    const raw = oldSave(6);
    const g = migrateGame(JSON.parse(raw))!;
    const w = g.world!;
    const goal = guideGoal(g)!;
    expect(goal.dungeonId).toBe('emeraldTemple');
    const from = w.pos[g.heroes[0].id];
    expect(goalLineText(g, goal, from)).toBe(`次の目的: ${DUNGEONS.get('emeraldTemple').name}（${direction8(w, from, goal.tile)}・${def().regions[w.tiles[goal.tile].r].name}）`);
    expect(signposts(g, w)).toEqual([]);
    expect(w.storyQueue).toBeUndefined();
  });

  it('前の地図の途中から、自動プレイで最後まで止まらずに遊べる（2人・4人）', () => {
    for (const n of [2, 4]) {
      const g = migrateGame(JSON.parse(oldSave(11, n)))!;
      const { game, log } = playToEnd(g, 60000, { straight: true });
      expect(log.errors, `${n}人`).toEqual([]);
      expect(['ending', 'gameover'], `${n}人`).toContain(game.mode);
      expect([game.world!.width, game.world!.height]).toEqual([8, 35]);
    }
  }, 120000);
});

describe('段階6a: 広い地図を自動プレイで最後まで', () => {
  it('2人・4人とも、詰まらずに終わる（クリアか全滅か侵食度100%）', () => {
    for (const n of [2, 4]) for (const seed of [1, 2]) {
      const { game, log } = playToEnd(fresh(seed, CK, n), 60000, { straight: true });
      expect(log.errors, `${n}人 seed ${seed}`).toEqual([]);
      expect(['ending', 'gameover'], `${n}人 seed ${seed}`).toContain(game.mode);
    }
  }, 240000);
});
