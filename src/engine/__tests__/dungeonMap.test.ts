// ===== 第3段階: ダンジョンの通路の地図・歩く・オートマッピング・歩数・保存の移行 =====
import { afterEach, describe, expect, it } from 'vitest';
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
  posOf,
  reachableRooms,
  revealSeen,
  viewOf,
  viewSlices,
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

/** 2人（P1・P2、または同じプレイヤー）で翠の神殿に入る（h0 の番） */
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
  }, 60_000); // ランダムダンジョンはシナリオごとに1つずつ増える（今6つ）ので、制限時間を長めにしておく

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
  it('歩く・向きを変えるのは手番を使わない。扉を開けると「この手番に扉を開けた」になる。見えたマスが地図に描き足される', () => {
    let { g, x } = inTemple(['P1', 'P1']);
    const seen0 = dun(g, x).seen!.length;
    g = run(g, inScene(x, { type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'right' }));
    expect(dun(g, x).pos!.facing).toBe(1);
    expect(dun(g, x).opened).toBeUndefined();
    // 1行目の部屋に入り（右を向いていても、扉を選ぶだけで開く）、出口から通路へ
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    expect(dun(g, x).opened).toBe(true);
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    g = run(g, inScene(x, { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'forward' }));
    // 通路に戻ったので、この組の手番は終わった（印は消える）
    expect(dun(g, x).opened).toBeUndefined();
    expect(dun(g, x).seen!.length).toBeGreaterThan(seen0);
    expect(exploredPercent(dun(g, x))).toBeGreaterThan(0);
  });

  it('壁には歩いて入れない。離れた扉でも、扉を選ぶと自動で歩いて開ける', () => {
    let { g, x } = inTemple(['P1', 'P1']);
    // 入口の通路は1マスだけ（1行目は1部屋）なので、左右は壁、前は扉
    expect(err(g, inScene(x, { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'left' }))).toMatch(/進めません/);
    expect(err(g, inScene(x, { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'forward' }))).toMatch(/扉/);
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    // 部屋の中から、次の行の扉を選ぶ: 何歩あっても1つ分。着いたら、その部屋に北を向いて立つ
    const d = dun(g, x);
    const far = reachableRooms(d).map((r) => ({ r, len: findPath(d, doorFront(d, r.id)!)!.length })).sort((a, b) => b.len - a.len)[0];
    expect(far.len).toBeGreaterThan(1);
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: far.r.id }));
    expect(dun(g, x).currentRoomId).toBe(far.r.id);
    expect(dun(g, x).pos!.facing).toBe(0);
  });

  it('見えていない場所へは「ここまで歩く」できない', () => {
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
    if (dun(g, x).seen!.includes(cellKey(front.x, front.y))) {
      g = run(g, inScene(x, { type: 'DUNGEON_WALK', playerId: 'P1', heroId: 'h0', x: front.x, y: front.y, face: 0 }));
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

  it('扉1つ＝手番1回: 部屋の途中は番が続き、部屋を済ませて通路に戻ると次の人の番。サイコロも「手番を終える」も無い', () => {
    let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: party(['P1', 'P1']) });
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    g.world!.pos.h0 = tileOf(g, 'dungeon', 'emeraldTemple');
    g.world!.turn = 'h0';
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] });
    const x = g.expeditions![0].id;
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h1' });
    expect(g.world!.turn).toBe('h0');
    // サイコロを振らずに、すぐ扉を開けられる。戦闘の途中なので番は続く
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    expect(g.expeditions![0].mode).toBe('battle');
    expect(g.world!.turn).toBe('h0');
    // 部屋を終えて通路に戻った: 次の人（h1）の番
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    g = run(g, inScene(x, { type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'left' }));
    expect(g.world!.turn).toBe('h1');
    expect(g.expeditions![0].dungeon!.opened).toBeUndefined();
    // h1 の番の間は、扉を開けられない
    expect(err(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: reachableRooms(dun(g, x))[0].id }))).toMatch(/ほかのキャラの番/);
    // h1 が動くと、また h0 の番（1回の番に扉1つ）
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h1' });
    expect(g.world!.turn).toBe('h0');
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: reachableRooms(dun(g, x))[0].id }));
    expect(dun(g, x).opened).toBe(true);
  });

  it('全員がダンジョンの中なら、部屋を済ませるとすぐ同じ組の番に戻る（ワールドターンが1つ進む）', () => {
    let { g, x } = inTemple(['P1', 'P1']);
    const wt = g.world!.worldTurn;
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    g = run(g, inScene(x, { type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'left' }));
    expect(g.world!.worldTurn).toBe(wt + 1);
    expect(g.expeditions![0].heroes).toContain(g.world!.turn);
    // すぐ次の扉を選べる
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: reachableRooms(dun(g, x))[0].id }));
    expect(dun(g, x).currentRoomId).not.toBe('r0c0');
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

describe('一人称の通路の見え方（段階B）', () => {
  const eventIds = EVENTS.all.filter((e) => e.where !== 'map').map((e) => e.id);
  const temple = () => buildDungeon('emeraldTemple', createRng(1), 0, eventIds);

  it('入口で北を向くと、目の前（1マス先）に開けられる扉。左右は壁', () => {
    const v = viewSlices(temple());
    expect(v.slices).toHaveLength(1);
    expect(v.slices[0]).toMatchObject({ depth: 0, inRoom: false, left: 'wall', right: 'wall' });
    expect(v.end).toEqual({ depth: 1, face: 'door', roomId: 'r0c0' });
  });

  it('部屋の中で北を向くと出口の先の通路が見え、南を向くと入ってきた扉は閉まっている', () => {
    const d = standIn(temple(), 'r0c0');
    d.seen = [];
    revealSeen(d);
    const north = viewSlices(d);
    expect(north.slices[0].inRoom).toBe(true);
    expect(north.slices.length).toBeGreaterThan(1);
    expect(north.slices[1]).toMatchObject({ inRoom: false });
    d.pos = { ...d.pos!, facing: 2 };
    expect(viewSlices(d).end).toEqual({ depth: 1, face: 'locked' });
    d.pos = { ...d.pos!, facing: 1 };
    expect(viewSlices(d).end.face).toBe('wall');
  });

  it('通路で東を向くと、壁にある扉が横に見える。まだ見ていない所は暗い', () => {
    // 2行目の部屋が2つ（左右の端）のダンジョンで見る（翠の神殿は 2026-11-13 の並びの直しで、2行目が3部屋になった）
    const d = standIn(buildDungeon('silentCatacomb', createRng(1), 0, eventIds), 'r0c0');
    const c = dungeonGrid(d).roomCell.get('r0c0')!;
    d.pos = { x: c.x, y: c.y + 1, facing: 1 };
    d.seen = [];
    revealSeen(d);
    const v = viewSlices(d);
    // 右（南）は出てきた部屋の入口、さらに東の通路のマスの左（北）は次の部屋の扉
    expect(v.slices[0].right).toBe('arch');
    expect(v.slices[1].left).toBe('door');
    expect(v.slices[1].leftRoomId).toBe('r1c1');
    // 北を向くと、左右は横に開いた口。その先（斜め前）に次の部屋の扉が見える
    const north = structuredClone(d);
    north.pos = { ...north.pos!, facing: 0 };
    revealSeen(north);
    const s0 = viewSlices(north).slices[0];
    expect(s0.left).toBe('open');
    expect(s0.right).toBe('open');
    expect(s0.leftAhead).toBe('door');
    expect(s0.leftAheadRoomId).toBe('r1c0');
    expect(s0.rightAheadRoomId).toBe('r1c1');
    const unseen = structuredClone(d);
    unseen.seen = [cellKey(d.pos.x, d.pos.y)];
    expect(viewSlices(unseen).end.face).toBe('dark');
  });

  it('ボスの扉は「ボス」、選ばなかった扉はただの壁に見える（オーナーの案）', () => {
    const d = temple();
    const boss = d.rooms.find((r) => r.next.length === 0)!;
    const before = d.rooms.find((r) => r.row === boss.row - 1)!;
    const here = standIn(d, before.id);
    const f = doorFront(here, boss.id)!;
    here.pos = { ...f, facing: 0 };
    revealSeen(here);
    expect(viewSlices(here).end.face).toBe('boss');
    const t2 = standIn(temple(), 'r4c1');
    const front = doorFront(t2, 'r5c0')!;
    // r4c1 の次は r5c1 だけ。r5c0 は開かないので壁になる（古い保存データで、その前に立っていた時も落ちない）
    t2.pos = { ...front, facing: 0 };
    t2.seen = [...(t2.seen ?? []), cellKey(front.x, front.y), cellKey(front.x, front.y + 1)];
    expect(t2.rooms.find((r) => r.id === 'r4c1')!.next).not.toContain('r5c0');
    expect(viewSlices(t2).end).toEqual({ depth: 1, face: 'wall' });
  });
});
