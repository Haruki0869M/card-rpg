// ===== 第3段階: ダンジョンの通路の地図・歩く・オートマッピング・歩数・保存の移行 =====
import { afterEach, describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { actorOf, setLocalPlayers } from '../../store/battleConfig';
import type { DungeonRun, GameCommand, GameState, PlayerId } from '../../types';
import {
  applyGameCommand,
  buildDungeon,
  cellKey,
  createGame,
  createRng,
  doorFront,
  dungeonGrid,
  dungeonNavigator,
  exploredPercent,
  findPath,
  migrateGame,
  posOf,
  reachableRooms,
  viewOf,
  walkableKeys,
} from '../index';

afterEach(() => setLocalPlayers(null));

const party = (players: PlayerId[]) => players.map((p, i) => ({ classId: ['warrior', 'mage', 'guardian'][i], gender: 'male' as const, name: `h${i}`, playerId: p }));
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
const tileOf = (g: GameState, kind: string, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === kind && t.f.id === id);
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });
const dun = (g: GameState, x: string) => viewOf(g, x).dungeon!;

/** 2人（P1・P2、または同じプレイヤー）で翠の神殿に入り、h0 の番で探索力（フォーカス2で必ず4 → 8歩）を決める */
function inTemple(players: PlayerId[] = ['P1', 'P2']) {
  let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: party(players) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  g.world!.pos.h0 = g.world!.pos.h1 = tileOf(g, 'dungeon', 'emeraldTemple');
  if (players[1] !== players[0]) {
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: players[1], heroId: 'h1', accept: true });
  }
  g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
  const x = g.expeditions![0].id;
  g.heroes[0].focus = 2;
  g = run(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: 'P1', heroId: 'h0', focusUsed: 2 }));
  return { g, x };
}

/** 目的の部屋の扉の前まで1歩ずつ歩く（手番のキャラの担当として） */
function walkToDoor(g: GameState, x: string, roomId: string): GameState {
  const front = doorFront(dun(g, x), roomId)!;
  for (const d of findPath(dun(g, x), front)!) {
    const v = viewOf(g, x);
    const nav = dungeonNavigator(v)!;
    const rel = (['forward', 'right', 'back', 'left'] as const)[(d - posOf(v.dungeon!).facing + 4) % 4];
    g = run(g, inScene(x, { type: 'DUNGEON_STEP', playerId: nav.playerId, heroId: nav.id, dir: rel }));
  }
  return g;
}

/** 部屋 room を「通った部屋」として立たせた複製（地図の確認用） */
function standIn(run0: DungeonRun, roomId: string): DungeonRun {
  const r = structuredClone(run0);
  r.currentRoomId = roomId;
  r.rooms.find((x) => x.id === roomId)!.cleared = true;
  const c = dungeonGrid(r).roomCell.get(roomId)!;
  r.pos = { x: c.x, y: c.y, facing: 0 };
  return r;
}

/** その地図で、入口から1行目の部屋、各部屋から次の部屋の扉まで歩いて行けるか */
function checkConnected(d: DungeonRun) {
  const grid = dungeonGrid(d);
  expect(grid.roomCell.size).toBe(d.rooms.length);
  // 入口から1行目のすべての扉へ
  for (const r of d.rooms.filter((x) => x.row === 0)) expect(findPath(d, doorFront(d, r.id)!), `${d.dungeonId} 入口→${r.id}`).toBeDefined();
  for (const r of d.rooms) {
    // 扉の前は通路のマス
    const f = doorFront(d, r.id)!;
    expect(grid.at.get(cellKey(f.x, f.y))?.kind, `${d.dungeonId} ${r.id} の扉の前`).toBe('hall');
    const here = standIn(d, r.id);
    for (const n of r.next) expect(findPath(here, doorFront(d, n)!), `${d.dungeonId} ${r.id}→${n}`).toBeDefined();
  }
}

describe('通路の地図（部屋のつながりから決まった手順で作る）', () => {
  const eventIds = EVENTS.all.filter((e) => e.where !== 'map').map((e) => e.id);

  it('すべてのダンジョンで、マスが重ならず、すべての部屋の扉まで歩いて行ける', () => {
    for (const def of DUNGEONS.all) checkConnected(buildDungeon(def.id, createRng(1), 0, eventIds));
  });

  it('ランダムダンジョンを種を変えて300回作っても、重ならず、つながっている', () => {
    const random = DUNGEONS.all.filter((d) => d.random);
    expect(random.length).toBeGreaterThan(0);
    for (const def of random) for (let seed = 1; seed <= 300; seed++) checkConnected(buildDungeon(def.id, createRng(seed), 0, eventIds));
  });

  it('同じ部屋の並びなら同じ地図。地図づくりで乱数を引かない', () => {
    const a = createRng(5);
    const b = createRng(5);
    const d1 = buildDungeon('emeraldTemple', a, 0, eventIds);
    // 乱数の進み方は、地図を作らなかった時と同じ（部屋の敵・宝箱の分だけ）
    const d2 = buildDungeon('emeraldTemple', b, 0, eventIds);
    expect(a.state).toBe(b.state);
    expect(d1.pos).toEqual(d2.pos);
    expect(dungeonGrid(d1).cells).toEqual(dungeonGrid(structuredClone(d2)).cells);
  });

  it('入った時は入口のまわりだけ見えている（探索度は小さい）', () => {
    const d = buildDungeon('emeraldTemple', createRng(1), 0, eventIds);
    expect(d.pos).toEqual({ ...dungeonGrid(d).start, facing: 0 });
    expect(d.seen!.length).toBeGreaterThan(0);
    expect(exploredPercent(d)).toBeLessThan(25);
  });
});

describe('通路を歩く', () => {
  it('歩くと歩数を1使い、向きを変えるのは0。見えたマスが地図に描き足される', () => {
    let { g, x } = inTemple(['P1', 'P1']);
    const steps = dun(g, x).explore!;
    expect(steps).toBe((BALANCE.exploreBase + BALANCE.exploreSlots) * BALANCE.dungeonStepsPerExplore);
    const seen0 = dun(g, x).seen!.length;
    g = run(g, inScene(x, { type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'right' }));
    expect(dun(g, x).pos!.facing).toBe(1);
    expect(dun(g, x).explore).toBe(steps);
    // 1行目の部屋に入り、出口から通路へ
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    expect(dun(g, x).explore).toBe(steps - 1);
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    g = run(g, inScene(x, { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'forward' }));
    expect(dun(g, x).explore).toBe(steps - 2);
    expect(dun(g, x).seen!.length).toBeGreaterThan(seen0);
    expect(exploredPercent(dun(g, x))).toBeGreaterThan(0);
  });

  it('壁や扉には歩いて入れない。扉は「扉を開ける」で、扉の前からだけ', () => {
    let { g, x } = inTemple(['P1', 'P1']);
    // 入口の通路は1マスだけ（1行目は1部屋）なので、左右は壁、前は扉
    expect(err(g, inScene(x, { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'left' }))).toMatch(/進めません/);
    expect(err(g, inScene(x, { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'forward' }))).toMatch(/扉/);
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    // 部屋の中から次の部屋の扉は開けられない（扉の前まで歩く）
    expect(err(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r1c0' }))).toMatch(/扉の前/);
  });

  it('見えていない場所へは「ここまで歩く」できない。見えている場所へは、まとめて歩ける', () => {
    let { g, x } = inTemple(['P1', 'P1']);
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    const d = dun(g, x);
    const far = [...walkableKeys(d)].map((k) => k.split(',').map(Number)).find(([cx, cy]) => !d.seen!.includes(cellKey(cx, cy)));
    if (far) expect(err(g, inScene(x, { type: 'DUNGEON_WALK', playerId: 'P1', heroId: 'h0', x: far[0], y: far[1] }))).toMatch(/見ていない/);
    const front = doorFront(d, 'r1c0')!;
    g = run(g, inScene(x, { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'forward' }));
    const before = dun(g, x).explore!;
    const len = findPath(dun(g, x), front)!.length;
    if (dun(g, x).seen!.includes(cellKey(front.x, front.y))) {
      g = run(g, inScene(x, { type: 'DUNGEON_WALK', playerId: 'P1', heroId: 'h0', x: front.x, y: front.y, face: 0 }));
      expect(dun(g, x).explore).toBe(before - len);
      expect(dun(g, x).pos).toEqual({ ...front, facing: 0 });
    }
  });

  it('部屋に入ると、選ばなかった扉にはもう行けない（後ろの扉が閉まる）', () => {
    let { g, x } = inTemple(['P1', 'P1']);
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    g = walkToDoor(g, x, 'r1c1');
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r1c1' }));
    const d = dun(g, x);
    // r1c0 の扉の前は、もう歩ける場所ではない
    const front = doorFront(d, 'r1c0')!;
    expect(walkableKeys(d).has(cellKey(front.x, front.y))).toBe(false);
    expect(findPath(d, front)).toBeUndefined();
  });

  it('歩数を使い切ると、通路で次の人の番になる（部屋の出来事の途中では終わらない）', () => {
    let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: party(['P1', 'P1']) });
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    g.world!.pos.h0 = tileOf(g, 'dungeon', 'emeraldTemple');
    g.world!.turn = 'h0';
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] });
    const x = g.expeditions![0].id;
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h1' });
    g = run(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: 'P1', heroId: 'h0', focusUsed: 0 }));
    // 残り1歩で扉を開ける → 0歩。戦闘の途中なので番は続く
    g.expeditions![0].dungeon!.explore = 1;
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    expect(dun(g, x).explore).toBe(0);
    expect(g.world!.turn).toBe('h0');
    // 向きを変えるのは0歩なので、歩数が0でもできる。歩くのはできない
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    g.expeditions![0].dungeon!.explore = 1;
    // 残り1歩で通路へ出ると0歩になり、次の人（h1）の番
    g = run(g, inScene(x, { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'forward' }));
    expect(g.world!.turn).toBe('h1');
    expect(g.expeditions![0].dungeon!.explore).toBeNull();
  });
});

describe('歩くのは手番のキャラの担当の人だけ（扉は全員一致）', () => {
  it('手番でない人のキャラ・担当でない人は歩けない', () => {
    const { g, x } = inTemple();
    expect(dungeonNavigator(viewOf(g, x))!.id).toBe('h0');
    expect(err(g, inScene(x, { type: 'DUNGEON_TURN', playerId: 'P2', heroId: 'h1', dir: 'left' }))).toMatch(/手番のキャラ/);
    expect(err(g, inScene(x, { type: 'DUNGEON_TURN', playerId: 'P2', heroId: 'h0', dir: 'left' }))).toMatch(/担当/);
    expect(err(g, inScene(x, { type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'left' }))).toBeUndefined();
  });

  it('扉の前で1人が投票した後に歩くと、その票は無効になる', () => {
    let { g, x } = inTemple();
    const enter: GameCommand = { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' };
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: { ...enter, playerId: 'P2' } }));
    expect(viewOf(g, x).vote).toBeDefined();
    // 向きを変えるだけなら票は残る（同じ場所）
    g = run(g, inScene(x, { type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'back' }));
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: enter }));
    expect(dun(g, x).currentRoomId).toBe('r0c0');
  });

  it('ローカル協力: P2 のキャラの番なら、画面から送った歩く操作は P2 の操作になる', () => {
    let { g, x } = inTemple();
    g.world!.turn = 'h1';
    const v = viewOf(g, x);
    expect(dungeonNavigator(v)!.id).toBe('h1');
    const cmd: GameCommand = { type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h1', dir: 'right' };
    const actor = actorOf(v, cmd);
    expect(actor).toBe('P2');
    g = run(g, inScene(x, { ...cmd, playerId: actor }));
    expect(dun(g, x).pos!.facing).toBe(1);
  });

  it('同じ操作の列なら、どの端末でも同じ結果（オンラインの前提）', () => {
    const play = () => {
      let { g, x } = inTemple(['P1', 'P1']);
      g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
      return g;
    };
    expect(play()).toEqual(play());
  });
});

describe('古い保存（v14）の移行', () => {
  it('ダンジョンの途中: 今の部屋に立ち、通った部屋が見え、探索力は歩数（×2）になる', () => {
    let { g, x } = inTemple(['P1', 'P1']);
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    const old = structuredClone(g) as GameState & { version: number };
    const d = old.expeditions![0].dungeon!;
    d.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    delete d.pos;
    delete d.seen;
    d.explore = 3;
    old.version = 14;
    if (old.expeditions![0].battle) old.expeditions![0].battle.version = 14;
    const m = migrateGame(JSON.parse(JSON.stringify(old)))!;
    expect(m).not.toBeNull();
    expect(m.version).toBe(15);
    const md = m.expeditions![0].dungeon!;
    const c = dungeonGrid(md).roomCell.get('r0c0')!;
    expect(md.pos).toEqual({ x: c.x, y: c.y, facing: 0 });
    expect(md.seen).toContain(cellKey(c.x, c.y));
    expect(md.explore).toBe(3 * BALANCE.dungeonStepsPerExplore);
    expect(m.expeditions![0].battle?.version).toBe(15);
    // 移した後も、次の部屋の扉まで歩いて行ける
    const next = reachableRooms(md);
    expect(next.length).toBeGreaterThan(0);
    for (const r of next) expect(findPath(md, doorFront(md, r.id)!)).toBeDefined();
  });

  it('まだ部屋に入っていない保存は入口に立ち、判定前（null）はそのまま', () => {
    const { g } = inTemple(['P1', 'P1']);
    const old = structuredClone(g) as GameState & { version: number };
    const d = old.expeditions![0].dungeon!;
    delete d.pos;
    delete d.seen;
    d.explore = null;
    old.version = 14;
    const m = migrateGame(JSON.parse(JSON.stringify(old)))!;
    const md = m.expeditions![0].dungeon!;
    expect(md.pos).toEqual({ ...dungeonGrid(md).start, facing: 0 });
    expect(md.explore).toBeNull();
    expect(md.seen!.length).toBeGreaterThan(0);
  });
});
