// ===== 古い形（40行・52行）のダンジョンの途中の保存（オーナーの決定 6-B） =====
// 古い保存はそのまま読めて遊べる。古い形のダンジョンにいる時だけ、損をせずに撤退でき、入り直すと新しい形になる
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { dungeonRows, isLegacyLayout } from '../game/dungeon';
import type { DungeonRun, GameCommand, GameState, PlayerId, Room } from '../../types';
import { applyGameCommand, createGame, migrateGame, reachableRooms, retreatLoss, validateGame, viewOf, GAME_VERSION } from '../index';

const P: PlayerId = 'P1';
const newWorld = (seed = 3) =>
  createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: P })) });
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });
const tileOf = (g: GameState, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === id);

/** 翠の神殿に h0 だけで入る */
function inTemple(seed = 3) {
  let g = run(newWorld(seed), { type: 'STORY_CONTINUE', playerId: P });
  g.world!.pos.h0 = tileOf(g, 'emeraldTemple');
  g.world!.turn = 'h0';
  g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0', party: ['h0'] });
  const x = g.expeditions![0].id;
  // 外の h1 が手番を終えると、ダンジョンの中の組の番になる
  g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
  return { g, x };
}

/** 入ったダンジョンを、前の「40行」の形に見せかける（中の行を繰り返して足す。保存されていた形と同じく rooms だけが長い） */
function makeOldShape(d: DungeonRun, rows = 40) {
  const now = dungeonRows(d);
  const boss = d.rooms.filter((r) => r.row === now - 1);
  const body = d.rooms.filter((r) => r.row < now - 1);
  const out: Room[] = [...body];
  // ボスの手前の行（休憩1部屋）から、足した行（戦闘1部屋ずつ）へつなぐ
  let prev = body.filter((r) => r.row === now - 2);
  for (let row = now - 1; row < rows - 1; row++) {
    const room: Room = { id: `r${row}c0`, row, col: 0, type: 'battle', next: [], enemies: [{ defId: 'forestWolf', level: 3 }], cleared: false };
    for (const p of prev) p.next = [room.id];
    out.push(room);
    prev = [room];
  }
  const last: Room = { ...boss[0], id: `r${rows - 1}c0`, row: rows - 1 };
  for (const p of prev) p.next = [last.id];
  out.push(last);
  d.rooms = out;
}

describe('古い形のダンジョンの見分け', () => {
  it('今のデータの行の数と、保存された部屋の行の数が違えば古い形。入ったばかりの新しい形・ランダムダンジョンは当てはまらない', () => {
    const { g, x } = inTemple();
    const d = viewOf(g, x).dungeon!;
    expect(dungeonRows(d)).toBe(DUNGEONS.get('emeraldTemple').layout!.length);
    expect(isLegacyLayout(d)).toBe(false);
    makeOldShape(g.expeditions![0].dungeon!);
    expect(dungeonRows(g.expeditions![0].dungeon!)).toBe(40);
    expect(isLegacyLayout(g.expeditions![0].dungeon!)).toBe(true);
    expect(isLegacyLayout({ ...g.expeditions![0].dungeon!, random: true })).toBe(false);
  });
});

describe('古い保存（40行のダンジョンの途中）', () => {
  it('読み込める（版は v17 のまま）。そのまま扉を選んで遊べる', () => {
    const { g, x } = inTemple();
    makeOldShape(g.expeditions![0].dungeon!);
    // 前の版が保存していた項目（サイコロの残り）もそのまま
    g.expeditions![0].dungeon!.explore = 2;
    const saved = JSON.parse(JSON.stringify(g));
    expect(saved.version).toBe(GAME_VERSION);
    expect(GAME_VERSION).toBe(17);
    const m = migrateGame(saved)!;
    expect(m).not.toBeNull();
    expect(validateGame(m)).toBe(true);
    const d = m.expeditions!.find((e) => e.id === x)!.dungeon!;
    expect(dungeonRows(d)).toBe(40);
    expect(isLegacyLayout(d)).toBe(true);
    // 1部屋目に入れる（敵は保存された時のまま）
    const first = reachableRooms(d)[0];
    const after = run(m, inScene(x, { type: 'ENTER_ROOM', playerId: P, roomId: first.id }));
    expect(viewOf(after, x).mode).toBe('battle');
  });
});

describe('古い形のダンジョンからの撤退（損をしない）', () => {
  it('手に入れた宝を失わない。入り直すと新しい形になる（入り直す時の侵食度は、いつもどおり上がる）', () => {
    let { g, x } = inTemple();
    const exp = g.expeditions![0];
    makeOldShape(exp.dungeon!);
    // このダンジョンで手に入れた宝
    const item = { uid: 'old-1', itemId: 'steelSword' };
    g.heroes[0].stash.push(item);
    exp.dungeon!.gained.push(item);
    expect(retreatLoss(viewOf(g, x))).toBeUndefined();
    g = run(g, inScene(x, { type: 'RETREAT', playerId: P }));
    expect(g.heroes[0].stash.some((s) => s.uid === 'old-1')).toBe(true);
    expect(g.expeditions?.some((e) => e.id === x) ?? false).toBe(false);
    expect(g.log.some((l) => l.text.includes('何も失わずに引き返せた'))).toBe(true);
    // 入り直す: 新しい形（8行）
    g.world!.pos.h0 = tileOf(g, 'emeraldTemple');
    g.world!.turn = 'h0';
    g.world!.acted = g.world!.acted.filter((id) => id !== 'h0');
    const before = g.world!.corruption;
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0', party: ['h0'] });
    const d = g.expeditions![g.expeditions!.length - 1].dungeon!;
    expect(dungeonRows(d)).toBe(8);
    expect(isLegacyLayout(d)).toBe(false);
    expect(g.world!.corruption).toBe(before + BALANCE.corruptionOnDungeonEnter);
  });

  it('新しい形のダンジョンの撤退は今までどおり（宝を1つ失う）', () => {
    let { g, x } = inTemple();
    const exp = g.expeditions![0];
    const item = { uid: 'new-1', itemId: 'steelSword' };
    g.heroes[0].stash.push(item);
    exp.dungeon!.gained.push(item);
    expect(retreatLoss(viewOf(g, x))?.uid).toBe('new-1');
    g = run(g, inScene(x, { type: 'RETREAT', playerId: P }));
    expect(g.heroes[0].stash.some((s) => s.uid === 'new-1')).toBe(false);
    g.world!.pos.h0 = tileOf(g, 'emeraldTemple');
    g.world!.turn = 'h0';
    g.world!.acted = g.world!.acted.filter((id) => id !== 'h0');
    const before = g.world!.corruption;
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0', party: ['h0'] });
    expect(g.world!.corruption).toBe(before + BALANCE.corruptionOnDungeonEnter);
  });
});
