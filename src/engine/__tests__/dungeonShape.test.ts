// ===== ダンジョンの形（抜本的な見直し §2-1・§2-2・§2-5） =====
// 固定ダンジョン28か所の行の数・中ボスの行・偏り防止（全経路）・深さのレベル・深層ボーナス・古い形の見分け
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { ENEMIES } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getRoomType } from '../../data/rules';
import { SCENARIOS } from '../../data/scenarios';
import { DEPTH_TIER_NAME, depthStep, depthTier, dungeonRows, isLegacyLayout } from '../game/dungeon';
import { cardRewardOdds } from '../game/loot';
import type { DungeonDef, GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, buildDungeon, createGame, createRng } from '../index';

const P: PlayerId = 'P1';
type Layout = NonNullable<DungeonDef['layout']>;
const fixed = () => DUNGEONS.all.filter((d) => d.layout && !d.random);
const keyed = (sid: string) =>
  DUNGEONS.forScenario(sid)
    .filter((d) => d.rewardKey && !d.random)
    .sort((a, b) => a.baseLevel - b.baseLevel);

/** 入口からボスまでの全部の道（部屋の種類の並び） */
function allPaths(layout: Layout): string[][] {
  const out: string[][] = [];
  const walk = (r: number, c: number, path: string[]) => {
    const room = layout[r][c];
    const next = [...path, room.type];
    if (!room.next.length) out.push(next);
    else for (const n of room.next) walk(r + 1, n, next);
  };
  layout[0].forEach((_, c) => walk(0, c, []));
  return out;
}
/** 偏り防止の決まりに反している所（無ければ undefined） */
function biasOf(path: string[]): string | undefined {
  let battles = 0;
  for (let i = 0; i < path.length; i++) {
    battles = path[i] === 'battle' ? battles + 1 : 0;
    if (battles > 2) return `通常の戦闘が3連続（${i - 1}行目〜）`;
    if (i && path[i] === 'rest' && path[i - 1] === 'rest') return `休憩→休憩（${i}行目）`;
    if (i && path[i] === 'event' && path[i - 1] === 'event') return `イベント→イベント（${i}行目）`;
  }
  return undefined;
}

describe('固定ダンジョン28か所の形', () => {
  it('7シナリオ × 4か所 = 28か所', () => {
    expect(fixed()).toHaveLength(28);
  });

  it.each(SCENARIOS.all.map((s) => [s.id] as const))('%s: 鍵 8・9・10行、最後 13行（7行目が中ボス・8行目が休憩）', (sid) => {
    const k = keyed(sid);
    expect(k.map((d) => d.layout!.length)).toEqual([8, 9, 10]);
    const finale = DUNGEONS.forScenario(sid).find((d) => d.finale)!;
    const L = finale.layout!;
    expect(L).toHaveLength(13);
    expect(L[6].map((r) => r.type)).toEqual(['midboss']);
    expect(L[7].map((r) => r.type)).toEqual(['rest']);
    // 中ボスは最後のダンジョンの7行目だけ
    for (const d of [...k, finale]) d.layout!.forEach((row, r) => row.forEach((room) => expect(room.type === 'midboss', `${d.id} ${r}`).toBe(d === finale && r === 6)));
    // 中ボスの敵は、登録されている敵
    expect(finale.pools.midboss?.length, finale.id).toBeGreaterThanOrEqual(1);
    for (const id of finale.pools.midboss!) expect(ENEMIES.has(id), id).toBe(true);
  });

  it.each(fixed().map((d) => [d.id, d] as const))('%s: つながり・最後はボス・ボスの前に休憩・部屋のデータ', (_id, d) => {
    const L = d.layout!;
    expect(L[0].every((r) => r.type === 'battle')).toBe(true);
    expect(L[L.length - 1].map((r) => r.type)).toEqual(['boss']);
    // ボスの前は「休憩」か「休憩→物語の部屋」
    expect(
      L.slice(-3, -1).some((row) => row.length === 1 && row[0].type === 'rest'),
      '休憩',
    ).toBe(true);
    for (let r = 0; r + 1 < L.length; r++) {
      for (const room of L[r]) {
        expect(room.next.length, `${r}`).toBeGreaterThan(0);
        for (const n of room.next) expect(n, `${r}`).toBeLessThan(L[r + 1].length);
      }
      L[r + 1].forEach((_, c) =>
        expect(
          L[r].some((p) => p.next.includes(c)),
          `${r + 1}:${c} に入れる`,
        ).toBe(true),
      );
    }
    for (const room of L.flat()) {
      expect(() => getRoomType(room.type)).not.toThrow();
      if (room.type === 'chest') expect(room.chest).toBeTruthy();
      if (room.type === 'event') expect(EVENTS.has(room.eventId!), room.eventId).toBe(true);
    }
  });

  it.each(fixed().map((d) => [d.id, d] as const))('%s: どの道でも 休憩→休憩なし・イベント→イベントなし・通常の戦闘は最大2連続', (_id, d) => {
    const paths = allPaths(d.layout!);
    expect(paths.length).toBeGreaterThan(1);
    for (const p of paths) expect(biasOf(p), p.join('→')).toBeUndefined();
    // どの道でも、ボスを入れて戦闘が3回以上ある（宝箱と休憩だけでは奥へ行けない）
    for (const p of paths) expect(p.filter((t) => getRoomType(t).battle).length, p.join('→')).toBeGreaterThanOrEqual(3);
  });
});

describe('ランダムダンジョンの偏り防止', () => {
  it('種を変えても、どの道でも決まりを守る。行の数は 6＋ボス のまま', () => {
    const randoms = DUNGEONS.all.filter((d) => d.random);
    expect(randoms).toHaveLength(7);
    const eventIds = EVENTS.forScenario('corruptionKing')
      .filter((e) => e.where !== 'map' && e.where !== 'spawn')
      .map((e) => e.id);
    for (const d of randoms) {
      for (let seed = 1; seed <= 60; seed++) {
        const run = buildDungeon(d.id, createRng(seed), 0, eventIds);
        expect(dungeonRows(run)).toBe(7);
        const layout: Layout = [];
        for (const room of run.rooms) (layout[room.row] ??= [])[room.col] = { type: room.type, next: room.next.map((id) => Number(id.split('c')[1])) };
        for (const p of allPaths(layout)) expect(biasOf(p), `${d.id} seed${seed}: ${p.join('→')}`).toBeUndefined();
        expect(isLegacyLayout(run)).toBe(false);
      }
    }
  });
});

describe('深さ（2行ごとに +1。段階3で 3行ごと → 2行ごと）', () => {
  it('段と深層ボーナスの段', () => {
    expect(BALANCE.depthBonus.rowsPerStep).toBe(2);
    expect([0, 1, 2, 3, 4, 5, 6, 8, 9, 12].map(depthStep)).toEqual([0, 0, 1, 1, 2, 2, 3, 4, 4, 6]);
    expect([0, 2, 4, 6, 9, 12].map(depthTier)).toEqual([0, 1, 2, 3, 3, 3]);
    expect(BALANCE.depthBonus.reward).toEqual([0, 0.15, 0.3, 0.5]);
    expect(DEPTH_TIER_NAME).toHaveLength(BALANCE.depthBonus.reward.length);
  });

  it.each(fixed().map((d) => [d.id, d] as const))('%s: 敵のレベル = 基準 + 行÷2 + 部屋の種類の加算。5行目以降の戦闘・強敵は1体多い（最大4）', (_id, d) => {
    const run = buildDungeon(d.id, createRng(7), 0, []);
    expect(dungeonRows(run)).toBe(d.layout!.length);
    expect(isLegacyLayout(run)).toBe(false);
    for (const room of run.rooms) {
      const b = getRoomType(room.type).battle;
      if (!b) continue;
      const lv = d.baseLevel + depthStep(room.row) + b.levelBonus;
      expect(
        room.enemies!.every((e) => e.level === lv),
        `${room.id}`,
      ).toBe(true);
      expect(room.enemies!.length).toBeLessThanOrEqual(BALANCE.maxEnemies);
      const ids = room.enemies!.map((e) => e.defId);
      if (b.pool === 'boss') expect(ids).toEqual(d.pools.boss);
      else if (b.pool === 'midboss') expect(ids).toEqual(d.pools.midboss);
      else {
        const pools = d.pools[b.pool].map((g) => g.join());
        const battleIds = d.pools.battle.flat();
        if (depthStep(room.row) >= BALANCE.depthBonus.extraEnemyFromStep && !(ids.length === BALANCE.maxEnemies && pools.includes(ids.join()))) {
          // 元の組 ＋ そのダンジョンの戦闘の敵が1体
          expect(pools, room.id).toContain(ids.slice(0, -1).join());
          expect(battleIds, room.id).toContain(ids[ids.length - 1]);
        } else expect(pools, room.id).toContain(ids.join());
      }
    }
    // 鍵8行のボスは入口の戦闘より Lv+5、10行は Lv+6、最後13行は Lv+8（深さの段 ＋ ボスの加算2）
    const boss = run.rooms[run.rooms.length - 1].enemies![0].level;
    const first = run.rooms[0].enemies![0].level;
    expect(boss - first).toBe(depthStep(d.layout!.length - 1) + 2);
  });

  it('カードの報酬の確率: レア以上の確率が、浅層 +15%・中層 +30%・深層 +50%。合計は100のまま', () => {
    expect(cardRewardOdds('battle')).toEqual([72, 24, 4]);
    // レア以上の確率が +15% / +30% / +50%（依頼の数字。増えた分だけコモンが減る）
    expect(cardRewardOdds('battle', 1)).toEqual([67.8, 27.6, 4.6]);
    expect(cardRewardOdds('battle', 2)).toEqual([63.6, 31.2, 5.2]);
    expect(cardRewardOdds('battle', 3)).toEqual([58, 36, 6]);
    expect(cardRewardOdds('elite', 3)).toEqual([32.5, 52.5, 15]);
    expect(cardRewardOdds('boss', 3)).toEqual([2.5, 67.5, 30]);
    for (const k of Object.keys(BALANCE.cardRewardOdds)) for (let t = 0; t < 4; t++) {
      const o = cardRewardOdds(k, t);
      expect(o.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
      expect(o.every((v) => v >= 0)).toBe(true);
      const base = cardRewardOdds(k, 0);
      expect(o[1] + o[2]).toBeCloseTo((base[1] + base[2]) * (1 + BALANCE.depthBonus.reward[t]), 0);
    }
  });
});

const newGame = (seed = 5) => {
  const g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: P })) });
  // 仮の拠点から入る形にする（世界マップを通らずに部屋の戦闘だけを確かめる）
  g.mode = 'hub';
  g.world = undefined;
  return g;
};
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
/** 1部屋目の戦闘に勝った時の経験値（部屋の行だけを変えて比べる） */
function expAtRow(row: number, mutate?: (g: GameState) => void): { exp: number; odds: number[] } {
  let g = newGame();
  g = run(g, { type: 'ENTER_DUNGEON', playerId: P, dungeonId: 'emeraldTemple' });
  g = run(g, { type: 'ENTER_ROOM', playerId: P, roomId: 'r0c0' });
  g.dungeon!.rooms[0].row = row;
  mutate?.(g);
  g.battle!.enemies.forEach((e) => (e.dead = true));
  g.battle!.phase = 'victory';
  g = run(g, { type: 'FINISH_BATTLE', playerId: P });
  return { exp: g.reward!.exp[0].gained, odds: g.reward!.cardOdds! };
}

describe('深層ボーナス（お金・経験値 +15% / +30% / +50%）', () => {
  it('奥の行ほど経験値が増え、カードのコモンが減る', () => {
    const base = expAtRow(0);
    // 浅層 = 3行目（行2）から、中層 = 5行目（行4）から、深層 = 7行目（行6）から
    expect(expAtRow(2).exp / base.exp).toBeCloseTo(1.15, 1);
    expect(expAtRow(4).exp / base.exp).toBeCloseTo(1.3, 1);
    expect(expAtRow(6).exp / base.exp).toBeCloseTo(1.5, 1);
    expect(base.odds).toEqual([72, 24, 4]);
    expect(expAtRow(4).odds).toEqual([63.6, 31.2, 5.2]);
    expect(expAtRow(6).odds).toEqual([58, 36, 6]);
  });

  it('古い形（40行）のダンジョンには付けない', () => {
    const base = expAtRow(0);
    // 行を足して40行に見せかける
    const old = expAtRow(6, (g) => {
      const last = g.dungeon!.rooms[g.dungeon!.rooms.length - 1];
      g.dungeon!.rooms.push({ ...last, id: 'r39c0', row: 39, col: 0, next: [] });
      expect(isLegacyLayout(g.dungeon!)).toBe(true);
    });
    expect(old.exp).toBe(base.exp);
    expect(old.odds).toEqual([72, 24, 4]);
  });
});

describe('中ボスの部屋', () => {
  it('ボスと同じレベルの加算・カードの確率。逃げられない。倒しても制覇にはならない', () => {
    const t = getRoomType('midboss');
    expect(t.behavior).toBe('battle');
    expect(t.battle).toMatchObject({ pool: 'midboss', levelBonus: getRoomType('boss').battle!.levelBonus, cardOdds: 'boss', noEscape: true });
    expect(t.battle!.boss).toBeUndefined();
    expect(t.layoutWeight ?? 0).toBe(0);
  });
});
