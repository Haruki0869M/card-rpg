// ダンジョンの並びを作り直した時の、途中の保存（docs/tasks/scenario2-rework-plan.md §2-7）。
// ダンジョンの部屋は入った時に作って保存に書くので、並びのデータを変えても、途中の冒険は入った時の並びのまま進む。
// 作り直す前の並び（型の写し）で入った保存を作り、JSON にして読み直し、前の並びのまま次の部屋へ進める事を確かめる
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { finaleLayout, keyLayout1, keyLayout3 } from '../../content/common/dungeonLayouts';
import { isLegacyLayout, reachableRooms } from '../game/dungeon';
import { migrateGame } from '../game/migrations';
import type { DungeonDef, GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, buildDungeon, createGame, createRng } from '../index';

const P: PlayerId = 'P1';
type Layout = NonNullable<DungeonDef['layout']>;

/** シナリオ2の作り直す前の並び（2026-11-14 まで。型 + その時のイベント）。沈んだ聖堂は保留で、まだ前の並びのまま（作り直したら足す） */
const BEFORE: Record<string, Layout> = {
  crystalCave: keyLayout1({ first: 'frostBridge', second: 'buriedChest', story: 'crystalGate' }),
  giantMine: keyLayout3({ first: 'buriedChest', second: 'furTrader', story: 'giantGate' }),
  iceCastle: finaleLayout({ first: 'iceSilhouette', story: 'queenThrone' }),
};
const shapeOf = (L: Layout) => JSON.stringify(L.map((row) => row.map((x) => [x.type, x.next, x.eventId ?? null])));

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}

/** 前の並びのデータで、そのダンジョンに入った所の保存を作る（データを一時的に前の並びに戻して入る） */
function savedInOldLayout(dungeonId: string): string {
  const def = DUNGEONS.get(dungeonId);
  const now = def.layout;
  const g = createGame({ seed: 11, scenarioId: 'frozenKingdom', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: P })) });
  g.world = undefined;
  try {
    def.layout = BEFORE[dungeonId];
    g.dungeon = buildDungeon(dungeonId, createRng(3), 0, []);
  } finally {
    def.layout = now;
  }
  g.mode = 'dungeon';
  return JSON.stringify(g);
}

describe('シナリオ2: 並びを作り直す前に入ったダンジョンの途中の保存', () => {
  it('作り直す前の並びのデータは、今の並びと違う（このテストが意味を持つ）', () => {
    for (const [id, L] of Object.entries(BEFORE)) expect(shapeOf(DUNGEONS.get(id).layout!), id).not.toBe(shapeOf(L));
  });

  it.each(Object.keys(BEFORE))('%s: 読み直しても入った時の並びのまま・古い形（40行）扱いにならない・次の部屋へ進める', (id) => {
    const g0 = migrateGame(JSON.parse(savedInOldLayout(id)));
    expect(g0, '読める').not.toBeNull();
    let g = g0!;
    const old = BEFORE[id];
    // 部屋の種類・つながり・イベントは、入った時の並び（前の並び）のまま
    for (const room of g.dungeon!.rooms) {
      const spec = old[room.row][room.col];
      expect(room.next, room.id).toEqual(spec.next.map((n) => `r${room.row + 1}c${n}`));
      if (spec.type === 'event') expect(room.eventId, room.id).toBe(spec.eventId);
      if (spec.type !== 'chest') expect(room.type, room.id).toBe(spec.type);
      if (room.eventId) expect(EVENTS.has(room.eventId), room.eventId).toBe(true);
    }
    expect(isLegacyLayout(g.dungeon!)).toBe(false);
    // 1部屋目の戦闘に勝つと、前の並びの2行目の部屋が選べる
    g = run(g, { type: 'ENTER_ROOM', playerId: P, roomId: 'r0c0' });
    g.battle!.enemies.forEach((e) => (e.dead = true));
    g.battle!.phase = 'victory';
    g = run(g, { type: 'FINISH_BATTLE', playerId: P });
    const next = reachableRooms(g.dungeon!);
    expect(next.map((r) => r.id)).toEqual(old[0][0].next.map((n) => `r1c${n}`));
    expect(next.map((r) => r.eventId ?? r.type)).toEqual(old[0][0].next.map((n) => old[1][n].eventId ?? old[1][n].type));
  });
});
