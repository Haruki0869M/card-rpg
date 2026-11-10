// ===== 扉の絵と扉のボタンが同じ並びになる（抜本的な見直し §1-2 案A） =====
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { buildDungeon, createRng, dungeonGrid, moveIntoRoom } from '../../engine';
import type { DungeonRun } from '../../types';
import { doorChoices, doorWallView, wallDoors, wallSlots, WALL_SLOT_X, type WallDoor } from './doors';

const eventIds = EVENTS.all.filter((e) => e.where !== 'map' && e.where !== 'spawn').map((e) => e.id);

/** 部屋 roomId を済ませて、その部屋に立った複製 */
function standIn(run0: DungeonRun, roomId: string): DungeonRun {
  const r = structuredClone(run0);
  r.rooms.find((x) => x.id === roomId)!.cleared = true;
  r.currentRoomId = roomId;
  moveIntoRoom(r, roomId);
  return r;
}
/** 構図に描かれる扉の部屋（左から右へ） */
function drawn(doors: WallDoor[]): string[] {
  const { slices, end } = doorWallView(doors);
  const side = slices.find((s) => s.leftAheadRoomId || s.rightAheadRoomId);
  return [side?.leftAheadRoomId, end.roomId, side?.rightAheadRoomId].filter((x): x is string => !!x);
}
const door = (roomId: string): WallDoor => ({ roomId, kind: 'door', omen: 'danger' });

describe('扉の壁の構図', () => {
  it('1つ=正面、2つ=左・右、3つ=左・正面・右', () => {
    expect(wallSlots(1)).toEqual(['center']);
    expect(wallSlots(2)).toEqual(['left', 'right']);
    expect(wallSlots(3)).toEqual(['left', 'center', 'right']);
    expect(drawn([door('a')])).toEqual(['a']);
    expect(drawn([door('a'), door('b')])).toEqual(['a', 'b']);
    expect(drawn([door('a'), door('b'), door('c')])).toEqual(['a', 'b', 'c']);
  });

  it('1つの時は正面の扉（1マス先）。2つの時は正面は壁で、広間の奥の左右に扉', () => {
    const one = doorWallView([door('a')]);
    expect(one.end).toMatchObject({ depth: 1, face: 'door', roomId: 'a' });
    const two = doorWallView([door('a'), door('b')]);
    expect(two.end.face).toBe('wall');
    expect(two.slices[1]).toMatchObject({ left: 'open', right: 'open', leftAhead: 'door', rightAhead: 'door', leftAheadRoomId: 'a', rightAheadRoomId: 'b' });
    // 手前のマスも左右に開いている（手前の壁で扉が隠れない）
    expect(two.slices[0]).toMatchObject({ left: 'open', right: 'open' });
    expect(two.slices[0].leftAhead).toBeUndefined();
    expect(two.slotOf).toEqual({ a: 'left', b: 'right' });
    expect(WALL_SLOT_X.left).toBeLessThan(0);
    expect(WALL_SLOT_X.right).toBeGreaterThan(0);
  });

  it('ボスの門・中ボスの重い扉は、大きな門の形で描く', () => {
    const v = doorWallView([{ roomId: 'm', kind: 'midboss' }]);
    expect(v.end.face).toBe('boss');
    expect(doorWallView([{ roomId: 'b', kind: 'boss' }]).end.face).toBe('boss');
  });
});

describe('全部のダンジョンのどの通路でも、絵の扉の数と並び = ボタンの数と並び', () => {
  it('入口と、どの部屋を済ませた後でも一致する（扉が1つも描かれない通路・絵に無いボタンが無い）', () => {
    let checked = 0;
    for (const def of DUNGEONS.all) {
      for (const seed of [1, 7]) {
        const d = buildDungeon(def.id, createRng(seed), 0, eventIds);
        const spots = [d, ...d.rooms.filter((r) => r.next.length).map((r) => standIn(d, r.id))];
        for (const run of spots) {
          const choices = doorChoices(run);
          // 次の行の部屋は、全部がボタンになる
          const nextIds = run.currentRoomId ? run.rooms.find((r) => r.id === run.currentRoomId)!.next : run.rooms.filter((r) => r.row === 0).map((r) => r.id);
          expect(choices.map((c) => c.room.id).sort(), `${def.id} ${run.currentRoomId ?? '入口'}`).toEqual([...nextIds].sort());
          // 今のデータに、4つ以上の扉が並ぶ通路は無い（絵は3つまで）
          expect(choices.length, `${def.id} ${run.currentRoomId ?? '入口'}`).toBeLessThanOrEqual(3);
          expect(choices.length).toBeGreaterThan(0);
          // 絵の扉（左から右）= ボタン（左から右）
          expect(drawn(wallDoors(choices)), `${def.id} ${run.currentRoomId ?? '入口'}`).toEqual(choices.map((c) => c.room.id));
          // ボタンは地図の左から右の順
          const xs = choices.map((c) => dungeonGrid(run).roomCell.get(c.room.id)!.x);
          expect([...xs].sort((a, b) => a - b)).toEqual(xs);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('ボタンの名前: 1つ=正面の扉、2つ=左・右、3つ=左・真ん中・右', () => {
    const d = buildDungeon('emeraldTemple', createRng(1), 0, eventIds);
    expect(doorChoices(d).map((c) => c.place)).toEqual(['正面の扉']);
    const names = new Set<string>();
    for (const r of d.rooms.filter((q) => q.next.length)) names.add(doorChoices(standIn(d, r.id)).map((c) => c.place).join('/'));
    expect([...names].every((n) => ['正面の扉', '左の扉/右の扉', '左の扉/真ん中の扉/右の扉'].includes(n))).toBe(true);
    expect(names.has('左の扉/右の扉')).toBe(true);
  });
});
