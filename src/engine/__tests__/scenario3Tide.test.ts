// ===== シナリオ3の作り直し A組の区切り1: 潮の仕組み（docs/tasks/scenario3-rework-plan.md §3-1・オーナーの決定 6-A）=====
// 潮の時間の決まり・入る向きだけ閉じる・中から出られる（閉じ込められない）・道を探す・bot・保存して再開・2人の同行・地図の生成の欄
import { describe, expect, it } from 'vitest';
import { getScenario } from '../../data/scenarios';
import { TERRAINS } from '../../data/world';
import type { GameCommand, GameState, PlayerId, ScenarioMapDef } from '../../types';
import { applyGameCommand, createGame, migrateGame } from '../index';
import { walkCostToTide } from '../bot';
import { routeToward } from '../game/world/guide';
import { idxOf, moveCostOf, neighborInDir, neighbors, reachable } from '../game/world/hex';
import { startTileOf } from '../game/world/start';
import { freezeTide, releaseTide, tideStatus, tideTileNote, tideTraps } from '../game/world/tide';
import { tideNow, tideOf, timeOfDay, turnsUntilTideChange } from '../game/world/time';

const CK = 'corruptionKing';

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}

/**
 * 潮の試しの地図: シナリオ1の広い地図（15×42）を全部平原にして、真ん中に「干潟の首の盆地」を作る。
 * P = 盆地の中（宝箱の場所。tideIn）、N = 首（干潟）、B = 首の先（平原）。P のまわりは首以外は暗礁
 */
function tideGame(players: PlayerId[] = ['P1'], neck = 'tideFlat') {
  let g = createGame({ seed: 3, scenarioId: CK, difficulty: 'normal', party: players.map((playerId, i) => ({ classId: ['warrior', 'priest'][i], gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  const w = g.world!;
  w.tiles = w.tiles.map((t) => ({ t: 'plains', r: t.r, seen: true }));
  w.wanderers = [];
  w.spawns = [];
  w.nextSpawnAt = 9999;
  const P = idxOf(w, 7, 20);
  const N = neighborInDir(w, P, 0)!;
  const B = neighborInDir(w, N, 0)!;
  for (let d = 1; d < 6; d++) w.tiles[neighborInDir(w, P, d)!].t = 'reef';
  w.tiles[N].t = neck;
  w.tiles[P].tideIn = true;
  return { g, P, N, B };
}
const at = (g: GameState, worldTurn: number) => {
  g.world!.worldTurn = worldTurn;
  return g.world!;
};

describe('潮の時間の決まり（乱数を引かない）', () => {
  it('朝・昼 = 満ち潮、夕方・夜 = 引き潮。4ワールドターンごとに入れ替わる', () => {
    const got = Array.from({ length: 12 }, (_, k) => `${timeOfDay(k + 1)}:${tideOf(k + 1)}:${turnsUntilTideChange(k + 1)}`);
    expect(got).toEqual([
      'morning:high:4', 'morning:high:3', 'noon:high:2', 'noon:high:1',
      'evening:low:4', 'evening:low:3', 'night:low:2', 'night:low:1',
      'morning:high:4', 'morning:high:3', 'noon:high:2', 'noon:high:1',
    ]);
  });

  it('止めた潮（tideFrozen）は時間帯で変わらない。戻すと時間帯の潮', () => {
    const { g } = tideGame();
    const w = at(g, 2);
    freezeTide(w);
    expect(w.tideFrozen).toBe('high');
    for (const t of [5, 6, 7, 8]) expect(tideNow({ ...w, worldTurn: t })).toBe('high');
    w.worldTurn = 6;
    releaseTide(w);
    expect(w.tideFrozen).toBeUndefined();
    expect(tideNow(w)).toBe('low');
  });

  it('地形のデータ: 3つとも移動力0（置き場・敵・陸の歩ける所では通れない）。暗礁は海でない（船でも通れない）', () => {
    for (const id of ['reef', 'tideChannel', 'tideFlat']) {
      expect(TERRAINS.get(id).moveCost, id).toBe(0);
      expect(TERRAINS.get(id).sea, id).toBeFalsy();
    }
    expect(TERRAINS.get('reef').tide).toBeUndefined();
    expect(TERRAINS.get('tideChannel')).toMatchObject({ name: '潮の水道', tide: 'high', tideShip: true });
    expect(TERRAINS.get('tideFlat')).toMatchObject({ name: '干潟', tide: 'low' });
    expect(TERRAINS.get('tideFlat').tideShip).toBeFalsy();
  });
});

describe('入る向きだけ閉じる（オーナーの決定 6-A）', () => {
  it('干潟: 引き潮だけ外から入れる。暗礁はいつも通れない', () => {
    const { g, P, N, B } = tideGame();
    const w = at(g, 1);
    expect(moveCostOf(w, N, B)).toBe(0);
    expect(moveCostOf(w, N)).toBe(0);
    at(g, 5);
    expect(moveCostOf(w, N, B)).toBe(1);
    expect(moveCostOf(w, neighborInDir(w, P, 3)!, P)).toBe(0);
    w.ship = true;
    expect(moveCostOf(w, neighborInDir(w, P, 3)!, P)).toBe(0);
  });

  it('潮の水道: 満ち潮で、船がある時だけ外から入れる', () => {
    const { g, N, B } = tideGame(['P1'], 'tideChannel');
    const w = at(g, 1);
    expect(moveCostOf(w, N, B)).toBe(0);
    w.ship = true;
    expect(moveCostOf(w, N, B)).toBe(1);
    at(g, 5);
    expect(moveCostOf(w, N, B)).toBe(0);
  });

  it('盆地の中（tideIn）から首へは、潮が閉じていても・止まっていても出られる。首の上からも出られる', () => {
    for (const neck of ['tideFlat', 'tideChannel']) {
      const { g, P, N, B } = tideGame(['P1'], neck);
      const w = at(g, neck === 'tideFlat' ? 1 : 5); // 閉じている潮
      expect(moveCostOf(w, N, P), neck).toBe(1);
      const fromIn = reachable(w, P, 3);
      expect(fromIn.has(N) && fromIn.has(B), neck).toBe(true);
      // 首の上に立っている時: 外へも中へも出られる
      const fromNeck = reachable(w, N, 2);
      expect(fromNeck.has(B) && fromNeck.has(P), neck).toBe(true);
      // 外からは入れない
      const fromOut = reachable(w, B, 6);
      expect(fromOut.has(N) || fromOut.has(P), neck).toBe(false);
      // 潮が止まっても同じ
      freezeTide(w);
      w.worldTurn += 4;
      expect(reachable(w, P, 3).has(B), neck).toBe(true);
      expect(reachable(w, B, 6).has(P), neck).toBe(false);
    }
  });

  it('閉じ込められるマスが無い（tideTraps）。中の印が無いと閉じ込められる事も見つけられる', () => {
    const { g, P, B } = tideGame();
    const w = at(g, 5);
    expect(tideTraps(w, B)).toEqual([]);
    delete w.tiles[P].tideIn;
    expect(tideTraps(w, B)).toContain(P);
  });

  it('潮の地形の無い地図では、向きを渡しても今までと同じ移動力', () => {
    const g = createGame({ seed: 4, scenarioId: CK, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
    const w = g.world!;
    for (let i = 0; i < w.tiles.length; i += 7) for (const n of neighbors(w, i)) expect(moveCostOf(w, n, i)).toBe(moveCostOf(w, n));
    expect(tideStatus(w)).toBeUndefined();
  });
});

describe('道を探す（移動・施設へ向かう道・bot）', () => {
  it('施設へ向かう道（routeToward）は今の潮を見る。閉じていれば道なし、開けば首を通る', () => {
    const { g, P, N, B } = tideGame();
    const w = at(g, 1);
    expect(routeToward(w, B, P, 3)).toBeUndefined();
    at(g, 5);
    expect(routeToward(w, B, P, 3)).toEqual({ total: 2, stop: P });
    expect(reachable(w, B, 3).get(P)!.prev).toBe(N);
  });

  it('bot の道の見積もり: 潮の無い道があれば、潮が開いていても閉じていても同じ（行き来しない）。潮の道しか無ければ、開くまで待つ', () => {
    const { g, P, N, B } = tideGame();
    const w = g.world!;
    // B の右の列に暗礁の壁（干潟の切れ目が1つ・ずっと上に陸の切れ目が1つ）を作り、壁の向こうを目的地にする
    for (let r = 0; r < w.height; r++) w.tiles[idxOf(w, 11, r)].t = 'reef';
    const flat = idxOf(w, 11, 21);
    w.tiles[flat].t = 'tideFlat';
    w.tiles[idxOf(w, 11, 4)].t = 'plains';
    const target = idxOf(w, 13, 21);
    const from = idxOf(w, 9, 21);
    const step = (turn: number) => {
      at(g, turn);
      const d = walkCostToTide(w, from, target);
      // 一歩目に選ぶ隣（一番近いマス）
      return neighbors(w, from).filter((n) => d.has(n)).sort((a, b) => d.get(a)! - d.get(b)! || a - b)[0];
    };
    const open = step(5);
    const shut = step(1);
    expect(open).toBe(shut);
    expect(walkCostToTide(w, from, target).get(from)).toBeGreaterThan(10);
    // 陸の切れ目をふさぐと、潮の道しか無い: 閉じている間は道なし（待つ）・開いたら干潟を通る
    w.tiles[idxOf(w, 11, 4)].t = 'reef';
    at(g, 1);
    expect(walkCostToTide(w, from, target).has(from)).toBe(false);
    at(g, 5);
    expect(walkCostToTide(w, from, target).get(from)).toBeLessThan(8);
    // 盆地の中にいる時は、閉じていても出る道がある
    at(g, 1);
    expect(walkCostToTide(w, P, B).has(P)).toBe(true);
    expect(walkCostToTide(w, N, B).has(N)).toBe(true);
  });
});

describe('冒険の中で（保存して再開・2人）', () => {
  it('中から出る移動ができる・外からは入れない。保存（JSON）して読み直しても同じ', () => {
    const { g, P, N, B } = tideGame();
    const w = at(g, 1);
    const h = g.heroes[0];
    w.pos[h.id] = P;
    w.prevTile = P;
    w.move = 3;
    const again = migrateGame(JSON.parse(JSON.stringify(g)))!;
    expect(again.world!.tiles[P].tideIn).toBe(true);
    expect(tideNow(again.world!)).toBe('high');
    const moved = run(again, { type: 'WORLD_MOVE', playerId: 'P1', heroId: h.id, to: B, companions: [] });
    expect(moved.world!.pos[h.id]).toBe(B);
    expect(moved.world!.lastMove!.path).toEqual([P, N, B]);
    // 外から入ろうとすると、だめ
    const g2 = structuredClone(g);
    g2.world!.pos[h.id] = B;
    g2.world!.prevTile = B;
    const r = applyGameCommand(g2, { type: 'WORLD_MOVE', playerId: 'P1', heroId: h.id, to: N, companions: [] });
    expect(r.error).toBe('そこへは移動できません');
  });

  it('2人: 片方だけが閉じた潮の向こう（盆地の中）にいても、手番は回り、中の人は外へ出られる', () => {
    let { g, P, B } = tideGame(['P1', 'P2']);
    const [a, b] = g.heroes;
    const w = at(g, 1);
    w.pos[a.id] = P;
    w.pos[b.id] = B;
    w.prevTile = w.pos[w.turn];
    const start = w.worldTurn;
    for (let k = 0; k < 8 && g.world!.worldTurn < start + 3; k++) {
      if (g.world!.story) g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
      const h = g.heroes.find((x) => x.id === g.world!.turn)!;
      g = run(g, { type: 'WORLD_WAIT', playerId: h.playerId, heroId: h.id });
    }
    expect(g.world!.worldTurn).toBeGreaterThanOrEqual(start + 3);
    // まだ満ち潮（干潟は閉じている）: 中の人は出られる・外の人は入れない
    expect(tideNow(g.world!)).toBe('high');
    expect(reachable(g.world!, P, 2).has(B)).toBe(true);
    expect(reachable(g.world!, B, 6).has(P)).toBe(false);
  });

  it('2人の同行: 盆地の中から、閉じた首を通って一緒に出られる（提案 → 同意）', () => {
    let { g, P, N, B } = tideGame(['P1', 'P2']);
    const [a, b] = g.heroes;
    const w = at(g, 1);
    w.pos[a.id] = P;
    w.pos[b.id] = P;
    w.turn = a.id;
    w.prevTile = P;
    w.move = 3;
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: a.id, targetId: b.id });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P2', heroId: b.id, accept: true });
    g = run(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: a.id, to: B, companions: [b.id] });
    expect(g.world!.moveProposal?.to).toBe(B);
    g = run(g, { type: 'WORLD_MOVE_AGREE', playerId: 'P2', accept: true });
    expect([g.world!.pos[a.id], g.world!.pos[b.id]]).toEqual([B, B]);
    expect(g.world!.lastMove!.path).toEqual([P, N, B]);
  });

  it('2人の同行: 提案の後に潮が変わって行けなくなっても、同意で止まらない（提案が消えて、記録に1行。手番の人は選び直せる）', () => {
    let { g, P, B } = tideGame(['P1', 'P2']);
    const [a, b] = g.heroes;
    const w = at(g, 5); // 引き潮: 干潟が開いている
    w.pos[a.id] = B;
    w.pos[b.id] = B;
    w.turn = a.id;
    w.prevTile = B;
    w.move = 3;
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: a.id, targetId: b.id });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P2', heroId: b.id, accept: true });
    g = run(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: a.id, to: P, companions: [b.id] });
    expect(g.world!.moveProposal?.to).toBe(P);
    // 潮が満ち潮で止まった（次の区切りの災厄の悪さと同じ形）
    g.world!.tideFrozen = 'high';
    g = run(g, { type: 'WORLD_MOVE_AGREE', playerId: 'P2', accept: true });
    expect(g.world!.moveProposal).toBeUndefined();
    expect([g.world!.pos[a.id], g.world!.pos[b.id]]).toEqual([B, B]);
    expect(g.log.some((l) => (typeof l === 'string' ? l : JSON.stringify(l)).includes('潮が変わって、選んだ所へは行けなくなった'))).toBe(true);
    // 手番の人は、まだ動ける（別の行き先を選び直す）
    const r = applyGameCommand(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: a.id, to: idxOf(g.world!, 10, 20), companions: [] });
    expect(r.error).toBeUndefined();
  });
});

describe('札とマスの説明の文', () => {
  it('満ち潮・引き潮・止まっている時の札の文', () => {
    const { g, N } = tideGame();
    const w = at(g, 3);
    expect(tideStatus(w)).toMatchObject({ tide: 'high', frozen: false, turns: 2, short: ['🌊満ち潮', 'あと2'] });
    expect(tideStatus(w)!.text).toBe('🌊 満ち潮（あと2ターンで引き潮）: 干潟は閉じている。閉じた所も、中からは出られる（世界の潮。戦闘の中の潮とは別）');
    expect(tideTileNote(w, TERRAINS.get(w.tiles[N].t))).toBe('引き潮の間だけ歩いて渡れる。今は満ち潮: あと2ターンで開く（中からは出られる）');
    at(g, 7);
    expect(tideStatus(w)!.text).toBe('🐚 引き潮（あと2ターンで満ち潮）: 干潟を歩いて渡れる。閉じた所も、中からは出られる（世界の潮。戦闘の中の潮とは別）');
    expect(tideTileNote(w, TERRAINS.get('tideFlat'))).toBe('引き潮の間だけ歩いて渡れる。今は開いている: あと2ターンで閉じる');
    expect(tideTileNote(w, TERRAINS.get('tideChannel'))).toBe('満ち潮の間だけ船で通れる（船が必要です）。今は引き潮: あと2ターンで開く（中からは出られる）');
    freezeTide(w);
    expect(tideStatus(w)).toMatchObject({ frozen: true, turns: undefined, short: ['🐚引き潮', '止まる'] });
    expect(tideStatus(w)!.text).toBe('🐚 引き潮（潮が止まっていて、変わらない）: 干潟を歩いて渡れる。閉じた所も、中からは出られる（世界の潮。戦闘の中の潮とは別）');
    expect(tideTileNote(w, TERRAINS.get('tideChannel'))).toBe('満ち潮の間だけ船で通れる（船が必要です）。潮が止まっていて、今は閉じたまま（中からは出られる）');
  });
});

describe('地図の生成の欄（BarrierDef.tideGaps・PocketDef.neck）', () => {
  /** シナリオ1の地図に潮の欄を足して冒険を作る（地図のデータは必ず元に戻す） */
  function withTide(seed: number, ship = false) {
    const map = getScenario(CK).map as ScenarioMapDef;
    const keep = structuredClone({ barriers: map.barriers, pockets: map.pockets });
    try {
      map.barriers = map.barriers!.map((b) => ({ ...b, tideGaps: { terrain: 'tideFlat', count: 1 } }));
      map.pockets = map.pockets!.map((p) => (p.kind === 'basin' ? { ...p, neck: 'tideFlat' } : { ...p, neck: 'tideChannel' }));
      const g = createGame({ seed, scenarioId: CK, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }, { classId: 'priest', gender: 'male', name: 'b', playerId: 'P2' }] });
      if (ship) g.world!.ship = true;
      return { g, map: structuredClone(map) };
    } finally {
      map.barriers = keep.barriers;
      map.pockets = keep.pockets;
    }
  }

  it('切れ目の1つ目はいつも通れる・2つ目が潮。盆地の首は潮で、中に「出られる」印。閉じ込められるマスが無い', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { g, map } = withTide(seed);
      const w = g.world!;
      for (const b of map.barriers!) {
        const line: string[] = [];
        for (let r = b.rows[0]; r <= b.rows[1]; r++) line.push(w.tiles[idxOf(w, r % 2 ? b.odd : b.even, r)].t);
        const passable = line.filter((t) => t !== b.terrain && t !== 'tideFlat');
        expect(passable.length, `seed ${seed} ${JSON.stringify(b)} ${line}`).toBeGreaterThanOrEqual(1);
        expect(line.filter((t) => t === 'tideFlat').length, `seed ${seed} ${line}`).toBeLessThanOrEqual(1);
      }
      for (const p of map.pockets!) {
        const P = idxOf(w, p.at[0], p.at[1]);
        const N = neighborInDir(w, P, p.open)!;
        expect(w.tiles[N].t, `seed ${seed} ${p.at}`).toBe(p.neck);
        expect(w.tiles[P].tideIn, `seed ${seed} ${p.at}`).toBe(true);
        expect(w.tiles[P].f, `seed ${seed} ${p.at}`).toBeDefined();
      }
      // 潮のマスの上には何も置かない・敵もいない
      w.tiles.forEach((t, i) => {
        if (!TERRAINS.get(t.t).tide) return;
        expect(t.f, `seed ${seed} tile ${i}`).toBeUndefined();
        expect(w.wanderers.some((x) => x.tile === i), `seed ${seed} tile ${i}`).toBe(false);
      });
      const start = startTileOf(g, w);
      expect(tideTraps(w, start), `seed ${seed}`).toEqual([]);
      expect(tideTraps({ ...w, ship: true }, start), `seed ${seed} ship`).toEqual([]);
      // 潮の印の付いたマスは、潮の首の盆地の中だけ
      expect(w.tiles.flatMap((t, i) => (t.tideIn ? [i] : [])).sort((x, y) => x - y)).toEqual(map.pockets!.map((p) => idxOf(w, p.at[0], p.at[1])).sort((x, y) => x - y));
    }
  });

  it('同じ種なら同じ地図（乱数は増えない・保存して読み直しても同じ）', () => {
    const a = withTide(7).g;
    const b = withTide(7).g;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const again = migrateGame(JSON.parse(JSON.stringify(a)))!;
    expect(JSON.stringify(again.world)).toBe(JSON.stringify(a.world));
  });

  // シナリオ3は区切り2から潮の欄のある地図（scenario3Map.test.ts）。潮の無い前の 8×35 の保存は scenario3OldSave.test.ts
  it('潮の欄の無い地図は今までどおり（潮の地形・中の印が無い）', () => {
    for (const s of ['corruptionKing', 'frozenKingdom', 'sandDynasty']) {
      const g = createGame({ seed: 1, scenarioId: s, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
      expect(g.world!.tiles.some((t) => TERRAINS.get(t.t).tide || t.tideIn || t.t === 'reef'), s).toBe(false);
      expect(g.world!.tideFrozen, s).toBeUndefined();
      expect(tideStatus(g.world!), s).toBeUndefined();
    }
  });
});
