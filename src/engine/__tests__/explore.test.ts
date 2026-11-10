// 段階6 探索の仕組み: 見晴らしの塔・時間で消える出現スポット・保存 v16 → v17
import { afterEach, describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { ITEMS } from '../../data/items';
import { getScenario } from '../../data/scenarios';
import { TERRAINS } from '../../data/world';
import type { GameCommand, GameState } from '../../types';
import { actorOf, setLocalPlayers } from '../../store/battleConfig';
import { applyGameCommand, createGame, createRng, migrateGame } from '../index';
import { addWatchtowers, placeSpawn, spawnAt, spawnTurnsLeft, tickSpawns } from '../game/world/explore';
import { hexDistance, neighbors } from '../game/world/hex';

afterEach(() => setLocalPlayers(null));
const fresh = (seed = 1, scenarioId = 'corruptionKing') =>
  createGame({ seed, scenarioId, difficulty: 'normal', party: ['P1', 'P2'].map((playerId, i) => ({ classId: 'warrior', gender: 'male', name: `仲間${i}`, playerId: playerId as 'P1' | 'P2' })) });
const towers = (g: GameState) => g.world!.tiles.flatMap((t, i) => (t.f?.kind === 'tower' ? [i] : []));
const run = (g: GameState, cmd: GameCommand) => {
  const r = applyGameCommand(g, cmd);
  expect(r.error).toBeUndefined();
  return r.state;
};
/** 手番の全員が待つ（ワールドターンを1つ進める） */
function passTurn(g: GameState): GameState {
  const t0 = g.world!.worldTurn;
  for (let k = 0; k < 10 && g.world!.worldTurn === t0; k++) {
    g.world!.story = undefined;
    const h = g.heroes.find((x) => x.id === g.world!.turn)!;
    g = run(g, { type: 'WORLD_WAIT', playerId: h.playerId, heroId: h.id });
  }
  return g;
}

describe('見晴らしの塔', () => {
  it('どのシナリオ・種でも2〜3か所、歩いて行ける陸の空きマスに置かれ、道から3マス以内', () => {
    for (const sc of ['corruptionKing', 'cursedArchipelago', 'frozenKingdom', 'sandDynasty', 'starCastle', 'clockworkEmpire', 'dreamLabyrinth'])
      for (let seed = 1; seed <= 6; seed++) {
        const g = fresh(seed, sc), w = g.world!, map = getScenario(sc).map!;
        const ts = towers(g);
        expect(ts.length, `${sc}:${seed}`).toBe(w.height >= BALANCE.watchtowerTallMap ? 3 : 2);
        for (const i of ts) {
          expect(TERRAINS.get(w.tiles[i].t).moveCost).toBeGreaterThan(0);
          expect(w.tiles[i].t).not.toBe(map.roadTerrain);
          const near = new Set([i]);
          for (let s = 0; s < 3; s++) for (const x of [...near]) for (const n of neighbors(w, x)) if (TERRAINS.get(w.tiles[n].t).moveCost > 0) near.add(n);
          expect([...near].some((x) => w.tiles[x].t === map.roadTerrain)).toBe(true);
        }
        for (const a of ts) for (const b of ts) if (a !== b) expect(hexDistance(w, a, b)).toBeGreaterThanOrEqual(5);
        // 同じ種なら同じ地図（乱数を引かない）
        expect(fresh(seed, sc)).toEqual(g);
      }
  });

  it('登ると半径4の霧が晴れ、手番は続き、1回だけ。P2のキャラでもP2の操作になる', () => {
    let g = fresh(3);
    const w = g.world!;
    const t = towers(g)[0];
    w.story = undefined;
    w.turn = 'h1';
    w.pos.h1 = t;
    for (const tile of w.tiles) tile.seen = false;
    // 少し遠くの宝箱（半径5〜7）も見える
    const far = w.tiles.findIndex((x, i) => x.f?.kind === 'chest' && !x.f.used && hexDistance(w, t, i) > BALANCE.watchtowerRadius && hexDistance(w, t, i) <= BALANCE.watchtowerSpotRadius);
    const cmd: GameCommand = { type: 'WORLD_INTERACT', playerId: 'P2', heroId: 'h1' };
    setLocalPlayers(['P1', 'P2']);
    expect(actorOf(g, cmd)).toBe('P2');
    g = run(g, cmd);
    const w2 = g.world!;
    expect(g.mode).toBe('world');
    expect(w2.turn).toBe('h1');
    w2.tiles.forEach((x, i) => {
      if (hexDistance(w2, t, i) <= BALANCE.watchtowerRadius) expect(x.seen).toBe(true);
      else if (hexDistance(w2, t, i) > BALANCE.watchtowerSpotRadius) expect(x.seen).toBe(false);
    });
    if (far >= 0) expect(w2.tiles[far].seen).toBe(true);
    expect(w2.tiles[t].f!.used).toBe(true);
    expect(applyGameCommand(g, cmd).error).toBe('もう調べました');
  });
});

describe('時間で消える出現スポット', () => {
  it('最初は spawnFirstAt ターン目に出て、そのあとは6〜8ターンごと。決まったターン数で消える', () => {
    let g = fresh(5);
    expect(g.world!.spawns).toEqual([]);
    expect(g.world!.nextSpawnAt).toBe(BALANCE.spawnFirstAt);
    const seen: { turn: number; kind: string; until: number }[] = [];
    for (let k = 0; k < 30 && g.mode === 'world'; k++) {
      g = passTurn(g);
      const w = g.world!;
      for (const s of w.spawns ?? []) {
        expect(spawnTurnsLeft(w, s)).toBeGreaterThanOrEqual(1);
        expect(s.until).toBeGreaterThanOrEqual(w.worldTurn);
        if (!seen.some((x) => x.until === s.until && x.kind === s.kind)) seen.push({ turn: w.worldTurn, kind: s.kind, until: s.until });
      }
      expect((w.spawns ?? []).length).toBeLessThanOrEqual(1);
    }
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[0].turn).toBe(BALANCE.spawnFirstAt);
    for (let i = 1; i < seen.length; i++) {
      const gap = seen[i].turn - seen[i - 1].turn;
      expect(gap).toBeGreaterThanOrEqual(BALANCE.spawnEveryMin);
      expect(gap).toBeLessThanOrEqual(BALANCE.spawnEveryMax);
    }
    for (const s of seen) expect(s.until - s.turn + 1).toBe(BALANCE.spawnLife[s.kind as 'star']);
  });

  it('同じ種・同じ操作なら、保存して読み直しても同じ所に同じ物が出る', () => {
    let a = fresh(9);
    for (let k = 0; k < 4; k++) a = passTurn(a);
    let b = migrateGame(JSON.parse(JSON.stringify(a)))!;
    for (let k = 0; k < 12; k++) {
      a = passTurn(a);
      b = passTurn(JSON.parse(JSON.stringify(b)));
    }
    expect(b.world!.spawns).toEqual(a.world!.spawns);
    expect(b.rngState).toBe(a.rngState);
  });

  it('期限が過ぎると消える（ターンの初めに）。キャラの近く3〜6マスの陸の空きマス', () => {
    const g = fresh(2);
    const w = g.world!;
    const rng = createRng(1);
    const s = placeSpawn(g, w, rng, 'thief')!;
    expect(s).toBeDefined();
    expect(w.tiles[s.tile].seen).toBe(true);
    expect(w.tiles[s.tile].f).toBeUndefined();
    const d = Math.min(...Object.values(w.pos).map((p) => hexDistance(w, p, s.tile)));
    expect(d).toBeGreaterThanOrEqual(BALANCE.spawnDistance[0]);
    expect(d).toBeLessThanOrEqual(BALANCE.spawnDistance[1]);
    expect(spawnTurnsLeft(w, s)).toBe(BALANCE.spawnLife.thief);
    w.nextSpawnAt = 999;
    for (let k = 1; k < BALANCE.spawnLife.thief; k++) {
      w.worldTurn++;
      tickSpawns(g, w, rng);
      expect(spawnAt(w, s.tile)).toBeDefined();
    }
    w.worldTurn++;
    tickSpawns(g, w, rng);
    expect(spawnAt(w, s.tile)).toBeUndefined();
  });

  it('置けるマスが無ければ置かず、次のターンにもう一度試す', () => {
    const g = fresh(2);
    const w = g.world!;
    w.nextSpawnAt = w.worldTurn;
    const heroes = { ...w.pos };
    // 全員を、どこにも行けない状態（世界マップにいない）にする
    w.pos = {};
    tickSpawns(g, w, createRng(1));
    expect(w.spawns).toEqual([]);
    expect(w.nextSpawnAt).toBe(w.worldTurn + 1);
    w.pos = heroes;
  });

  it.each(['star', 'peddler', 'thief'] as const)('%s: 入るとスポットが消えてイベントになり、P2のキャラならP2の操作', (kind) => {
    let g = fresh(4);
    const w = g.world!;
    w.story = undefined;
    const s = placeSpawn(g, w, createRng(3), kind)!;
    w.turn = 'h1';
    w.pos.h1 = s.tile;
    const cmd: GameCommand = { type: 'WORLD_INTERACT', playerId: 'P2', heroId: 'h1' };
    setLocalPlayers(null);
    expect(actorOf(g, cmd)).toBe('P2');
    setLocalPlayers(['P2']);
    expect(actorOf(g, cmd)).toBe('P2');
    g = run(g, cmd);
    expect(g.mode).toBe('event');
    expect(g.event?.eventId).toBe({ star: 'spawnStar', peddler: 'spawnPeddler', thief: 'spawnThief' }[kind]);
    expect(spawnAt(g.world!, s.tile)).toBeUndefined();
    // 結果を閉じる操作も P2: ローカル協力（1台）では手番のキャラの担当、オンラインでは押した P2 の端末
    setLocalPlayers(null);
    expect(actorOf(g, { type: 'FINISH_EVENT', playerId: 'P1' })).toBe('P2');
    setLocalPlayers(['P2']);
    expect(actorOf(g, { type: 'FINISH_EVENT', playerId: 'P1' })).toBe('P2');
    g = run(g, { type: 'CHOOSE_EVENT', playerId: 'P2', optionIndex: 1, heroId: 'h1', focusUsed: 0 });
    g = run(g, { type: 'FINISH_EVENT', playerId: 'P2' });
    if (kind === 'thief') {
      expect(g.mode).toBe('battle');
      expect(g.battleInfo?.goldMul).toBe(3);
    } else {
      expect(g.mode).toBe('world');
      expect(g.world!.turn).toBe('h1');
    }
    if (kind === 'peddler') {
      const shop = g.heroes[1].peddler!;
      expect(shop.items.length + shop.cards.length).toBeGreaterThan(0);
      expect(shop.items.every((x) => ITEMS.get(x.item.itemId).rarity === 'epic')).toBe(true);
    }
  });

  it('出現スポット専用のイベントは、突発イベント・ダンジョンの候補に入らない', () => {
    for (const id of ['spawnStar', 'spawnPeddler', 'spawnThief']) expect(EVENTS.get(id).where).toBe('spawn');
    let g = fresh(6);
    g.world!.story = undefined;
    // ダンジョンに入って、部屋のイベントの候補を確かめる
    const d = g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && !DUNGEONS.get(t.f.id).requiresKeys?.length);
    g.world!.pos.h0 = d;
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' });
    const rooms = g.expeditions?.flatMap((x) => x.dungeon?.rooms ?? []) ?? [];
    expect(rooms.some((r) => String(r.eventId ?? '').startsWith('spawn'))).toBe(false);
  });
});

describe('保存 v16 → v17', () => {
  it('地図・位置・霧・乱数を変えず、塔を空きマスに足し、最初の出現は少し後。2回直しても同じ', () => {
    const old = fresh(7);
    old.version = 16;
    for (const t of old.world!.tiles) if (t.f?.kind === 'tower') delete t.f;
    delete old.world!.spawns;
    delete old.world!.nextSpawnAt;
    delete old.world!.nextSpawnId;
    old.world!.worldTurn = 12;
    const before = structuredClone(old);
    const m = migrateGame(structuredClone(old))!;
    expect(m).not.toBeNull();
    expect(m.version).toBe(17);
    expect(m.rngState).toBe(before.rngState);
    const terrain = (g: GameState) => g.world!.tiles.map((t) => [t.t, t.r, t.seen]);
    expect(terrain(m)).toEqual(terrain(before));
    before.world!.tiles.forEach((t, i) => { if (t.f) expect(m.world!.tiles[i].f).toEqual(t.f); });
    expect(m.world!.pos).toEqual(before.world!.pos);
    expect(towers(m).length).toBe(3);
    for (const i of towers(m)) expect(before.world!.tiles[i].f).toBeUndefined();
    expect(m.world!.spawns).toEqual([]);
    expect(m.world!.nextSpawnAt).toBe(12 + BALANCE.spawnMigrateDelay);
    const again = structuredClone(m);
    expect(addWatchtowers(again, again.world!)).toBe(0);
    expect(again).toEqual(m);
  });

  it('空きマスが無い古い地図には、塔を無理に置かない', () => {
    const old = fresh(8);
    old.version = 16;
    for (const t of old.world!.tiles) if (t.f?.kind === 'tower') delete t.f;
    // 空きマスをすべて埋める（宝箱を開けた跡）
    for (const t of old.world!.tiles) if (!t.f) t.f = { kind: 'chest', id: 'mapChest', used: true };
    const m = migrateGame(structuredClone(old))!;
    expect(m).not.toBeNull();
    expect(towers(m)).toEqual([]);
  });
});
