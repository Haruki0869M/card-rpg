// ===== 第3段階C1: 扉の気配（感知・フクロウ・霊感）と周囲の警戒 =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CLASSES } from '../../data/classes';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, cellKey, createGame, doorOmen, dungeonGrid, heroSensesDoors, partySensesDoors, reachableRooms, statChance, viewOf } from '../index';

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });

/** 1人（classId）で翠の神殿に入り、探索力を決める（フォーカス2で必ず8歩）。最初の部屋 r0c0 を通った状態にする */
function pastFirstRoom(classId = 'warrior', players: PlayerId[] = ['P1', 'P1']) {
  let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((playerId, i) => ({ classId: i === 0 ? classId : 'mage', gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  g.world!.pos.h0 = g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'emeraldTemple');
  g.world!.turn = 'h0';
  g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] });
  const x = g.expeditions![0].id;
  g = run(g, { type: 'WORLD_WAIT', playerId: players[1], heroId: 'h1' });
  g.heroes[0].focus = 4;
  g = run(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: 'P1', heroId: 'h0' }));
  g.expeditions![0].dungeon!.explore = 3;
  g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
  const e = g.expeditions![0];
  e.mode = 'dungeon';
  e.battle = undefined;
  e.dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
  g = run(g, inScene(x, { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'forward' }));
  return { g, x };
}
const view = (g: GameState, x: string) => viewOf(g, x);
const sensingClass = () => CLASSES.all.find((c) => c.exploreAbility.effect.kind !== 'sense' && statChance(createGame({ seed: 1, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: c.id, gender: 'male', name: 'a', playerId: 'P1' }] }).heroes[0], 'per') >= BALANCE.dungeonSensePer)!;

describe('扉の気配が分かるパーティ', () => {
  it('感知の成功率が高い職・フクロウのお供・霊感（召喚士）なら分かる。そうでなければ分からない', () => {
    const one = (classId: string) => createGame({ seed: 1, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId, gender: 'male', name: 'a', playerId: 'P1' }] }).heroes[0];
    const warrior = one('warrior');
    expect(statChance(warrior, 'per')).toBeLessThan(BALANCE.dungeonSensePer);
    expect(heroSensesDoors(warrior)).toBe(false);
    expect(heroSensesDoors(one(sensingClass().id))).toBe(true);
    expect(heroSensesDoors(one('summoner'))).toBe(true);
    expect(heroSensesDoors({ ...warrior, pet: { petId: 'owl', color: 'brown', name: 'ホー', love: 0, acts: 0 } })).toBe(true);
    expect(heroSensesDoors({ ...warrior, pet: { petId: 'owl', color: 'brown', name: 'ホー', love: 0, acts: 0 }, hp: 0 })).toBe(false);
  });

  it('気配が分からないパーティでは、見えている開けられる扉でも気配は出ない', () => {
    const { g, x } = pastFirstRoom('warrior');
    const v = view(g, x);
    expect(partySensesDoors(v)).toBe(false);
    for (const r of reachableRooms(v.dungeon!)) expect(doorOmen(v, r)).toBeUndefined();
  });

  it('フクロウがいると、見えている開けられる扉に種類のおおまかな気配が出る。見えていない扉・開かない扉・ボスには出ない', () => {
    const { g, x } = pastFirstRoom('warrior');
    g.heroes[0].pet = { petId: 'owl', color: 'brown', name: 'ホー', love: 0, acts: 0 };
    const v = view(g, x);
    const d = v.dungeon!;
    const grid = dungeonGrid(d);
    for (const r of d.rooms) {
      const c = grid.roomCell.get(r.id)!;
      const seen = d.seen!.includes(cellKey(c.x, c.y));
      const reach = reachableRooms(d).some((q) => q.id === r.id);
      const omen = doorOmen(v, r);
      if (seen && reach) expect(omen).toBe({ battle: 'danger', elite: 'danger', chest: 'treasure', rest: 'rest', event: 'mystery' }[r.type as 'battle']);
      else expect(omen).toBeUndefined();
    }
    const boss = d.rooms.find((r) => r.type === 'boss')!;
    expect(doorOmen(v, boss)).toBeUndefined();
  });
});

describe('周囲の警戒', () => {
  it('歩数を2使う。完全成功で開けられる扉の場所と気配が分かり、次の戦闘に全員「応援」', () => {
    let { g, x } = pastFirstRoom('warrior');
    const before = view(g, x).dungeon!.explore!;
    g = run(g, inScene(x, { type: 'DUNGEON_WATCH', playerId: 'P1', heroId: 'h0', focusUsed: 2 }));
    const v = view(g, x);
    const d = v.dungeon!;
    expect(d.explore).toBe(before); // 警戒は扉の数を使わない
    expect(d.watchRoll).toEqual(['focus', 'focus']);
    const reach = reachableRooms(d);
    expect(reach.length).toBeGreaterThan(0);
    for (const r of reach) {
      const c = dungeonGrid(d).roomCell.get(r.id)!;
      expect(d.seen).toContain(cellKey(c.x, c.y));
      expect(d.seen).toContain(cellKey(c.x, c.y - 1));
      expect(doorOmen(v, r)).toBeDefined();
    }
    expect(g.heroes[0].nextBattleStatuses.inspired).toBe(BALANCE.dungeonWatchInspired);
  });

  it('1つの通路で1回だけ。扉の数は使わない（0でもできる）。サイコロの前は使えない', () => {
    let { g, x } = pastFirstRoom('warrior');
    const before = viewOf(g, x).dungeon!.explore;
    g = run(g, inScene(x, { type: 'DUNGEON_WATCH', playerId: 'P1', heroId: 'h0', focusUsed: 0 }));
    expect(viewOf(g, x).dungeon!.explore).toBe(before);
    expect(err(g, inScene(x, { type: 'DUNGEON_WATCH', playerId: 'P1', heroId: 'h0', focusUsed: 0 }))).toMatch(/もう警戒/);
    const fresh = pastFirstRoom('warrior');
    fresh.g.expeditions![0].dungeon!.explore = 0;
    expect(err(fresh.g, inScene(fresh.x, { type: 'DUNGEON_WATCH', playerId: 'P1', heroId: 'h0', focusUsed: 0 }))).toBeUndefined();
    fresh.g.expeditions![0].dungeon!.explore = null;
    expect(err(fresh.g, inScene(fresh.x, { type: 'DUNGEON_WATCH', playerId: 'P1', heroId: 'h0', focusUsed: 0 }))).toMatch(/サイコロ/);
  });

  it('成功0なら何も分からない。同じ操作なら同じ結果', () => {
    // 感知の低い職でフォーカスを使わずに振り、成功0になる種を探す（乱数の種は Rng だけ）
    const play = () => {
      const { g, x } = pastFirstRoom('warrior');
      return { r: applyGameCommand(g, inScene(x, { type: 'DUNGEON_WATCH', playerId: 'P1', heroId: 'h0', focusUsed: 0 })), x };
    };
    const a = play();
    const b = play();
    expect(a.r.state).toEqual(b.r.state);
    const d = viewOf(a.r.state, a.x).dungeon!;
    const n = d.watchRoll!.filter((s) => s !== 'miss').length;
    if (n === 0) expect(d.sensed ?? []).toEqual([]);
    else expect((d.sensed ?? []).length).toBeGreaterThan(0);
  });

  it('オンライン: 手番のキャラの担当でない人は使えない', () => {
    const { g, x } = pastFirstRoom('warrior', ['P1', 'P2']);
    expect(err(g, inScene(x, { type: 'DUNGEON_WATCH', playerId: 'P2', heroId: 'h1', focusUsed: 0 }))).toBeDefined();
  });
});

describe('フクロウのお知らせ', () => {
  it('フクロウがいて、扉の気配が新しく見えたら「何かの気配！」。いなければ出ない', async () => {
    const { explorationNotices } = await import('../../store/presentation');
    const step: GameCommand = { type: 'DUNGEON_STEP', playerId: 'P1', heroId: 'h0', dir: 'forward' };
    // 最初の部屋の中（気配はまだ見えない）→ 通路へ出ると、開けられる扉が見えて気配が出る
    const setup = (owl: boolean) => {
      const { g, x } = pastFirstRoom('warrior');
      // 部屋の中に戻して、もう一度通路へ出る操作で比べる
      const before = structuredClone(g);
      const d = before.expeditions![0].dungeon!;
      const c = dungeonGrid(d).roomCell.get('r0c0')!;
      d.pos = { x: c.x, y: c.y, facing: 0 };
      d.seen = [cellKey(c.x, c.y)];
      if (owl) before.heroes[0].pet = { petId: 'owl', color: 'brown', name: 'ホー', love: 0, acts: 0 };
      const after = run(before, inScene(x, step));
      return explorationNotices(before, after, inScene(x, step));
    };
    expect(setup(true).map((n) => n.name)).toContain('何かの気配！');
    expect(setup(false).map((n) => n.name)).not.toContain('何かの気配！');
  });
});
