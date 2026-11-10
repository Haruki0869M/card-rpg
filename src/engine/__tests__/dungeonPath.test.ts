// ===== ダンジョンの通路の手直し（オーナーの案）: 選ばなかった扉は壁になる・探索力の判定をみんなで決める =====
import { afterEach, describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { setLocalPlayers } from '../../store/battleConfig';
import type { DungeonRun, GameCommand, GameState, PlayerId } from '../../types';
import {
  activeCells,
  applyGameCommand,
  buildDungeon,
  cellKey,
  createGame,
  createRng,
  doorFront,
  dungeonGrid,
  exploredPercent,
  findPath,
  revealSeen,
  viewOf,
  viewSlices,
  visibleFrom,
  walkableKeys,
} from '../index';

afterEach(() => setLocalPlayers(null));

const eventIds = EVENTS.all.filter((e) => e.where !== 'map').map((e) => e.id);

/** 部屋 roomId を通った（今いる）ことにした複製。それより前の行は path の部屋を通ったことにする */
function standIn(run0: DungeonRun, path: string[]): DungeonRun {
  const r = structuredClone(run0);
  for (const id of path) r.rooms.find((x) => x.id === id)!.cleared = true;
  const last = path[path.length - 1];
  r.currentRoomId = last;
  const c = dungeonGrid(r).roomCell.get(last)!;
  r.pos = { x: c.x, y: c.y, facing: 0 };
  return r;
}

/** 入口から、各行の最初の「行ける部屋」を選んで進む道（部屋のID） */
function firstPath(d: DungeonRun): string[] {
  const out: string[] = [];
  let next = d.rooms.filter((r) => r.row === 0).map((r) => r.id);
  while (next.length) {
    const r = d.rooms.find((x) => x.id === next[next.length - 1])!;
    out.push(r.id);
    next = r.next;
  }
  return out;
}

describe('選ばなかった扉は壁になる（activeCells）', () => {
  it('入ったばかりは全部のマスが残っている（まだ何も選んでいない）', () => {
    for (const def of DUNGEONS.all) {
      const d = buildDungeon(def.id, createRng(1), 0, eventIds);
      expect(activeCells(d).size, def.id).toBe(dungeonGrid(d).cells.length);
    }
  });

  it('扉を選ぶと、同じ行のほかの扉は壁になり、その扉へだけ続いていた通路も歩けない', () => {
    for (const def of DUNGEONS.all) {
      for (let seed = 1; seed <= (def.random ? 40 : 1); seed++) {
        const d = buildDungeon(def.id, createRng(seed), 0, eventIds);
        const path = firstPath(d);
        for (let i = 0; i < path.length; i++) {
          const here = standIn(d, path.slice(0, i + 1));
          const act = activeCells(here);
          const grid = dungeonGrid(here);
          const room = here.rooms.find((x) => x.id === path[i])!;
          // 同じ行のほかの部屋は残らない
          for (const o of here.rooms.filter((x) => x.row === room.row && x.id !== room.id)) {
            const c = grid.roomCell.get(o.id)!;
            expect(act.has(cellKey(c.x, c.y)), `${def.id} ${o.id}`).toBe(false);
          }
          // 次に行ける扉には、今の部屋から必ず歩いて行ける
          for (const n of room.next) expect(findPath(here, doorFront(here, n)!), `${def.id} ${room.id}→${n}`).toBeDefined();
          // 歩けるマスはすべて残ったマス
          for (const k of walkableKeys(here)) expect(act.has(k)).toBe(true);
          // 通路は、今の部屋の出口と次の扉の列の間だけ
          const xs = [grid.roomCell.get(room.id)!.x, ...room.next.map((n) => grid.roomCell.get(n)!.x)];
          for (const k of walkableKeys(here)) {
            const [x, y] = k.split(',').map(Number);
            if (grid.at.get(k)!.kind === 'hall') {
              expect(y).toBe(2 * room.row + 2);
              expect(x).toBeGreaterThanOrEqual(Math.min(...xs));
              expect(x).toBeLessThanOrEqual(Math.max(...xs));
            }
          }
        }
      }
    }
  });

  it('選ばなかった扉は一人称の絵でも壁（扉にも暗がりにもならない）', () => {
    const d = buildDungeon('emeraldTemple', createRng(1), 0, eventIds);
    // 部屋が2つ以上ある行の1つ前の部屋に立ち、行ける扉の隣の「行けない扉」の前を見る
    const before = d.rooms.find((r) => r.next.length >= 1 && d.rooms.filter((x) => x.row === r.row + 1).length > r.next.length)!;
    expect(before).toBeDefined();
    const here = standIn(d, [before.id]);
    const other = here.rooms.find((x) => x.row === before.row + 1 && !before.next.includes(x.id))!;
    const f = doorFront(here, other.id)!;
    here.pos = { ...f, facing: 0 };
    here.seen = dungeonGrid(here).cells.map((c) => cellKey(c.x, c.y));
    const v = viewSlices(here);
    expect(v.end.face).toBe('wall');
    expect(v.end.roomId).toBeUndefined();
    for (const s of v.slices) for (const side of [s.left, s.right]) expect(side).not.toBe('locked');
  });

  it('見えるマスは残ったマスだけで、選んだ道を全部見れば探索度は100%に届く', () => {
    for (const def of DUNGEONS.all) {
      const d = buildDungeon(def.id, createRng(2), 0, eventIds);
      const path = firstPath(d);
      let r = structuredClone(d);
      // 道の上のすべてのマスに立って、4方向を見る
      for (let i = -1; i < path.length; i++) {
        const here = i < 0 ? structuredClone(r) : standIn(r, path.slice(0, i + 1));
        here.seen = r.seen;
        for (const k of walkableKeys(here)) {
          const [x, y] = k.split(',').map(Number);
          for (const facing of [0, 1, 2, 3] as const) {
            here.pos = { x, y, facing };
            // 見えるのは残ったマスだけ
            const act = activeCells(here);
            for (const v of visibleFrom(here, here.pos)) if (!act.has(v)) expect.fail(`${def.id}: 残っていないマス ${v} が見えた`);
            revealSeen(here);
          }
        }
        r = here;
      }
      expect(exploredPercent(r), def.id).toBe(100);
    }
  });

  it('古い保存データ（選ばなかった扉のマスも見たことになっている）でも、探索度は100%を超えない', () => {
    const d = buildDungeon('emeraldTemple', createRng(1), 0, eventIds);
    const r = standIn(d, [firstPath(d)[0]]);
    r.seen = dungeonGrid(r).cells.map((c) => cellKey(c.x, c.y));
    expect(exploredPercent(r)).toBe(100);
  });
});

// ===== 探索力の判定をみんなで決める =====
const party = (players: PlayerId[]) => players.map((p, i) => ({ classId: ['warrior', 'mage', 'guardian'][i], gender: 'male' as const, name: `h${i}`, playerId: p }));
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
const tileOf = (g: GameState, kind: string, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === kind && t.f.id === id);
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });

function enterTemple(players: PlayerId[]) {
  let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: party(players) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  g.world!.pos.h0 = g.world!.pos.h1 = tileOf(g, 'dungeon', 'emeraldTemple');
  if (players[1] !== players[0]) {
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: players[1], heroId: 'h1', accept: true });
  }
  g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
  return { g, x: g.expeditions![0].id };
}

describe('扉1つ＝手番1回（2人のプレイヤー）', () => {
  it('サイコロも「だれが振る？」も無い。入ったらすぐ、全員一致で扉を開けられる', () => {
    let { g, x } = enterTemple(['P1', 'P2']);
    const enter = { type: 'ENTER_ROOM', roomId: 'r0c0' } as const;
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: { ...enter, playerId: 'P1' } }));
    expect(viewOf(g, x).dungeon!.currentRoomId).toBeUndefined();
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: { ...enter, playerId: 'P2' } }));
    expect(viewOf(g, x).dungeon!.currentRoomId).toBe('r0c0');
    expect(viewOf(g, x).dungeon!.opened).toBe(true);
  });

  it('無くなった操作（探索のサイコロ・手番を終える）は受け付けない', () => {
    const { g, x } = enterTemple(['P1', 'P1']);
    for (const type of ['EXPLORE_ROLL', 'EXPLORE_REROLL', 'EXPLORE_ROLLER', 'EXPLORE_END']) {
      expect(err(g, inScene(x, { type, playerId: 'P1', heroId: 'h0' } as unknown as GameCommand))).toBeTruthy();
    }
  });
});
