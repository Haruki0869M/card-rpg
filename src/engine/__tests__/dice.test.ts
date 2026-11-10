// ===== 移動のサイコロ（オーナーの案）と、扉を選ぶだけのダンジョンのテスト =====
// 世界マップ: 1d6 ＋ 素早さのボーナス（+0〜+2）。ダンジョン: 1〜3 = 選べる扉の数。フォーカス1 = 目を見た後に1回だけ振り直し
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, createGame, doorFront, findPath, migrateGame, reachableRooms, speedBonusOf, statChance, viewOf, worldDiceBonus, GAME_VERSION } from '../index';
import { playToEnd } from '../bot';

const P: PlayerId = 'P1';
const party = (classes: string[]) => classes.map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: P }));
const newWorld = (seed = 1, classes = ['warrior', 'mage']) => createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: party(classes) });
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
const started = (seed = 1, classes?: string[]) => run(newWorld(seed, classes), { type: 'STORY_CONTINUE', playerId: P });
const tileOf = (g: GameState, kind: string, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === kind && t.f.id === id);
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });

describe('世界マップの移動のサイコロ', () => {
  it('目は1〜6、移動力 = 目 ＋ ボーナス。たくさん振ると全部の目が出る', () => {
    const faces = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const g = run(started(seed), { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0' });
      const d = g.world!.moveDice!;
      expect(d.sides).toBe(6);
      expect(d.face).toBeGreaterThanOrEqual(1);
      expect(d.face).toBeLessThanOrEqual(6);
      expect(g.world!.move).toBe(d.face + d.bonus.reduce((n, b) => n + b.value, 0));
      expect(d.total).toBe(g.world!.move);
      faces.add(d.face);
    }
    expect(faces.size).toBe(6);
  });

  it('素早さのボーナス: 成功率60%未満は+0、60%以上で+1、80%以上で+2', () => {
    const g = started();
    const h = g.heroes[0];
    const at = (agi: number) => {
      h.bonusStats = { ...h.bonusStats, agi };
      return { chance: statChance(h, 'agi', 'move'), bonus: speedBonusOf(h) };
    };
    for (const agi of [-40, -20, -5, 0, 5, 9, 10, 11, 20, 29, 30, 40]) {
      const { chance, bonus } = at(agi);
      expect(bonus).toBe(chance >= 80 ? 2 : chance >= 60 ? 1 : 0);
    }
    expect(BALANCE.moveDiceSpeed).toEqual([60, 80]);
  });

  it('ボーナスの名前が付く（素早さ・探索の能力・お供）。0 のものは出さない', () => {
    const g = started();
    const h = g.heroes[0];
    h.classId = 'lancer';
    const b = worldDiceBonus(h);
    expect(b.find((x) => x.label === '騎乗')?.value).toBe(1);
    expect(b.every((x) => x.value > 0)).toBe(true);
  });

  it('同じ状態から振れば同じ目（オンライン・保存して再開でも同じ）', () => {
    const g = started(7);
    const a = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0' });
    const b = run(JSON.parse(JSON.stringify(g)), { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0' });
    expect(a.world!.moveDice).toEqual(b.world!.moveDice);
    expect(a.rngState).toBe(b.rngState);
  });

  it('フォーカス1で振り直す: 2回目の目で決まる。1回だけ。動いた後・フォーカスが無い時はできない', () => {
    let g = run(started(3), { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0' });
    const first = g.world!.moveDice!;
    g.heroes[0].focus = 2;
    g = run(g, { type: 'WORLD_REROLL_MOVE', playerId: P, heroId: 'h0' });
    const d = g.world!.moveDice!;
    expect(g.heroes[0].focus).toBe(1);
    expect(d.rerolled).toBe(true);
    expect(d.first).toBe(first.face);
    expect(g.world!.move).toBe(d.total);
    expect(d.seq).not.toBe(first.seq);
    expect(err(g, { type: 'WORLD_REROLL_MOVE', playerId: P, heroId: 'h0' })).toMatch(/1回だけ/);
    // フォーカスが無い
    let g2 = run(started(3), { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0' });
    g2.heroes[0].focus = 0;
    expect(err(g2, { type: 'WORLD_REROLL_MOVE', playerId: P, heroId: 'h0' })).toMatch(/フォーカス/);
    // 振る前
    expect(err(started(3), { type: 'WORLD_REROLL_MOVE', playerId: P, heroId: 'h0' })).toMatch(/先に/);
    // 動いた後
    g2.heroes[0].focus = 3;
    const w = g2.world!;
    const to = [...(w.tiles.keys())].find((i) => i !== w.pos.h0 && !w.tiles[i].f && Math.abs(i - w.pos.h0) <= 1 && applyGameCommand(g2, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to: i, companions: [] }).error === undefined);
    if (to !== undefined) {
      g2 = run(g2, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to, companions: [] });
      if (g2.mode === 'world' && g2.world!.turn === 'h0') expect(err(g2, { type: 'WORLD_REROLL_MOVE', playerId: P, heroId: 'h0' })).toMatch(/動いた後/);
    }
  });

  it('平均は前の判定とほぼ同じか少し低い（難しめのまま）', () => {
    // 前: 2 ＋ 素早さ% × 4枠。今: 3.5 ＋ ボーナス
    for (const chance of [40, 50, 59, 60, 70, 79, 80, 90]) {
      const before = 2 + 4 * (chance / 100);
      const now = 3.5 + BALANCE.moveDiceSpeed.filter((t) => chance >= t).length;
      expect(now - before).toBeLessThanOrEqual(0.35);
      expect(before - now).toBeLessThanOrEqual(0.9);
    }
  });
});

describe('ダンジョンの探索のサイコロと扉', () => {
  function inTemple(seed = 3) {
    let g = newWorld(seed);
    g = run(g, { type: 'STORY_CONTINUE', playerId: P });
    g.world!.pos.h0 = tileOf(g, 'dungeon', 'emeraldTemple');
    g.world!.turn = 'h0';
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0', party: ['h0'] });
    const x = g.expeditions![0].id;
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    return { g, x };
  }
  const dun = (g: GameState, x: string) => viewOf(g, x).dungeon!;

  it('目は1〜3で、出た目 = 選べる扉の数', () => {
    const faces = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) {
      const { g, x } = inTemple(seed);
      const r = applyGameCommand(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: P, heroId: 'h0' }));
      if (r.error) continue;
      const d = dun(r.state, x);
      expect(d.exploreDice!.sides).toBe(3);
      expect(d.explore).toBe(d.exploreDice!.face);
      expect(d.exploreDice!.bonus).toEqual([]);
      faces.add(d.exploreDice!.face);
    }
    expect([...faces].sort()).toEqual([1, 2, 3]);
  });

  it('フォーカス1で振り直す: 振ったキャラだけ。扉を選んだ後はできない。1回だけ', () => {
    let { g, x } = inTemple();
    g.heroes[0].focus = 2;
    g = run(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: P, heroId: 'h0' }));
    const first = dun(g, x).exploreDice!;
    g = run(g, inScene(x, { type: 'EXPLORE_REROLL', playerId: P, heroId: 'h0' }));
    const d = dun(g, x).exploreDice!;
    expect(d.rerolled).toBe(true);
    expect(d.first).toBe(first.face);
    expect(dun(g, x).explore).toBe(d.total);
    expect(g.heroes[0].focus).toBe(1);
    expect(err(g, inScene(x, { type: 'EXPLORE_REROLL', playerId: P, heroId: 'h0' }))).toMatch(/1回だけ/);
    // 扉を選んだ後
    let b = inTemple();
    b.g.heroes[0].focus = 2;
    b.g = run(b.g, inScene(b.x, { type: 'EXPLORE_ROLL', playerId: P, heroId: 'h0' }));
    b.g = run(b.g, inScene(b.x, { type: 'ENTER_ROOM', playerId: P, roomId: 'r0c0' }));
    b.g.expeditions![0].mode = 'dungeon';
    b.g.expeditions![0].battle = undefined;
    if (dun(b.g, b.x).explore != null) expect(err(b.g, inScene(b.x, { type: 'EXPLORE_REROLL', playerId: P, heroId: 'h0' }))).toBeDefined();
  });

  it('扉1つで、どれだけ歩いても1だけ使う（遠い扉でも）', () => {
    let { g, x } = inTemple();
    g = run(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: P, heroId: 'h0' }));
    g.expeditions![0].dungeon!.explore = 3;
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: P, roomId: 'r0c0' }));
    expect(dun(g, x).explore).toBe(2);
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    const d = dun(g, x);
    const lens = reachableRooms(d).map((r) => ({ id: r.id, len: findPath(d, doorFront(d, r.id)!)!.length }));
    const far = lens.sort((a, b) => b.len - a.len)[0];
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: P, roomId: far.id }));
    expect(dun(g, x).explore).toBe(1);
    expect(dun(g, x).currentRoomId).toBe(far.id);
  });

  it('古い保存データ: スロットの結果は捨て、残り歩数は選べる扉の数（÷2 切り上げ、3まで）に直す', () => {
    const { g, x } = inTemple();
    const old = JSON.parse(JSON.stringify(g));
    old.version = GAME_VERSION;
    const exp = old.expeditions.find((e: { id: string }) => e.id === x);
    exp.dungeon.exploreRoll = ['hit', 'miss'];
    exp.dungeon.explore = 5;
    old.world.moveRoll = ['hit', 'hit', 'miss', 'miss'];
    const m = migrateGame(old)!;
    expect(m).not.toBeNull();
    const d = m.expeditions!.find((e) => e.id === x)!.dungeon!;
    expect(d.explore).toBe(3);
    expect((d as unknown as Record<string, unknown>).exploreRoll).toBeUndefined();
    expect((m.world as unknown as Record<string, unknown>).moveRoll).toBeUndefined();
  });

  it('自動プレイ（bot）は新しいルールで最後まで遊べる', () => {
    const { game, log } = playToEnd(newWorld(11, ['warrior', 'priest']), 60000);
    expect(log.errors.filter((e) => e.startsWith('stuck'))).toEqual([]);
    expect(['ending', 'gameover']).toContain(game.mode);
    // ダンジョンを大きくした（鍵40行・最後52行）ので、最後まで遊ぶのに時間がかかる
  }, 180_000);
});
