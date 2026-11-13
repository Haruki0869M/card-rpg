// ===== ダンジョンの形（抜本的な見直し §2-1・§2-2・§2-5） =====
// 固定ダンジョン28か所の行の数・中ボスの行・偏り防止（全経路）・深さのレベル・深層ボーナス・古い形の見分け
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { ENEMIES } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { DUNGEON_THEMES, getRoomType } from '../../data/rules';
import { SCENARIOS } from '../../data/scenarios';
import { DEPTH_TIER_NAME, depthStep, depthTier, dungeonRows, isLegacyLayout, roomKind } from '../game/dungeon';
import { cardRewardOdds } from '../game/loot';
import type { DungeonDef, GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, buildDungeon, createGame, createRng } from '../index';
import { keyLayout1 } from '../../content/common/dungeonLayouts';

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
/** 部屋の並びの形（type とつながり。イベント・宝箱の中身は見ない） */
const shapeOf = (L: Layout) => JSON.stringify(L.map((row) => row.map((x) => [x.type, x.next])));
/**
 * 1つ目の鍵の型（keyLayout1）で作ったダンジョンか（シナリオ2〜7の6か所）。
 * 2026-11-13（点検19の問題 A1・オーナーの OK）: この型だけ「ふつうの戦闘は2回以上」・選ぶ所 6 以上
 */
const isKeyLayout1 = (d: DungeonDef) => !!d.layout && shapeOf(d.layout) === shapeOf(keyLayout1({ first: 'a', second: 'b', story: 'c' }));
/** 戦う部屋（ふつうの戦闘・強敵・中ボス・ボス） */
const isCombat = (type: string) => !!getRoomType(type).battle;
/** ボスの前の休憩の行（最後の3行のうち、休憩1つだけの行） */
const restRowOf = (L: Layout) => [L.length - 2, L.length - 3].find((r) => L[r].length === 1 && L[r][0].type === 'rest')!;
/** 入口からボスまでの全部の道（行の番号つき） */
function allRowPaths(L: Layout): { r: number; type: string }[][] {
  const out: { r: number; type: string }[][] = [];
  const walk = (r: number, c: number, path: { r: number; type: string }[]) => {
    const next = [...path, { r, type: L[r][c].type }];
    if (!L[r][c].next.length) out.push(next);
    else for (const n of L[r][c].next) walk(r + 1, n, next);
  };
  L[0].forEach((_, c) => walk(0, c, []));
  return out;
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

  // 部屋の並びの決まり（docs/review/2026-11-13-room-variety2.md。2026-11-13 の2回目の直し。例外の一覧は置かない）
  it.each(fixed().map((d) => [d.id, d] as const))('%s: 行の部屋は1〜3つ・同じ行は全部ちがう type・どの辺も同じ type でない', (_id, d) => {
    const L = d.layout!;
    L.forEach((row, r) => {
      expect(row.length, `${r}行`).toBeGreaterThanOrEqual(1);
      expect(row.length, `${r}行`).toBeLessThanOrEqual(3);
      expect(new Set(row.map((x) => x.type)).size, `${r}行`).toBe(row.length);
      row.forEach((room, c) => {
        expect(new Set(room.next).size, `${r}:${c}`).toBe(room.next.length);
        room.next.forEach((n) => expect(L[r + 1][n].type, `${r}:${c}→${r + 1}:${n}`).not.toBe(room.type));
      });
    });
  });

  // 戦闘の濃さ（憲章1・3）: どの道でも、戦う部屋でない部屋が3つ以上続かない。ふつうの戦闘は鍵で3回以上・最後で4回以上。
  // 5行目（敵が1体増える行）からボスの前の休憩の手前までに、戦う部屋が鍵で2回以上・最後で3回以上（中ボスを含む）。
  // ただし、その間の行の数がそれより少ない時は、行の数まで（1つ目の鍵の8行のダンジョンは、ボスの前が「休憩→物語の部屋」なので、
  // 5行目より後で休憩の前は1行しかない。docs/review/2026-11-13-room-variety2.md に書いた）
  it.each(fixed().map((d) => [d.id, d] as const))('%s: どの道でも、戦わない部屋は2つまで・ふつうの戦闘が下限以上・奥の戦う部屋が下限以上', (_id, d) => {
    const L = d.layout!;
    const rest = restRowOf(L);
    const from = BALANCE.depthBonus.extraEnemyFromStep * BALANCE.depthBonus.rowsPerStep;
    const deepWant = Math.min(d.finale ? 3 : 2, rest - from);
    const paths = allRowPaths(L);
    expect(paths.length).toBeGreaterThan(1);
    for (const p of paths) {
      const label = p.map((x) => x.type).join('→');
      let run = 0;
      for (const x of p) {
        run = isCombat(x.type) ? 0 : run + 1;
        expect(run, label).toBeLessThan(3);
      }
      expect(p.filter((x) => x.type === 'battle').length, label).toBeGreaterThanOrEqual(d.finale ? 4 : isKeyLayout1(d) ? 2 : 3);
      expect(p.filter((x) => x.r >= from && x.r < rest && isCombat(x.type)).length, label).toBeGreaterThanOrEqual(deepWant);
    }
  });

  // 強敵は「選ぶ物」（憲章3）: 強敵の部屋は、同じ行に強敵でない部屋がある。強敵と別の物を選べる扉が1つ以上ある。
  // 選ぶ所（行き先が2つ以上の部屋）が2つ以上あり、「どちらの扉も同じ type」の選択は無い。一本道の行（部屋が1つ）は、
  // ボスの前の「休憩 →（物語の部屋）→ ボス」を除いて、3行以上続かない
  it.each(fixed().map((d) => [d.id, d] as const))('%s: 強敵は避けられる・選ぶ所がある・一本道が長く続かない', (_id, d) => {
    const L = d.layout!;
    for (const [r, row] of L.entries()) if (row.some((x) => x.type === 'elite')) expect(row.some((x) => x.type !== 'elite'), `${r}行`).toBe(true);
    const choices = L.flatMap((row, r) => row.filter((x) => x.next.length >= 2).map((x) => x.next.map((n) => L[r + 1][n].type)));
    expect(choices.length).toBeGreaterThanOrEqual(2);
    for (const ts of choices) expect(new Set(ts).size, ts.join('/')).toBeGreaterThan(1);
    expect(choices.some((ts) => ts.includes('elite') && ts.some((t) => t !== 'elite'))).toBe(true);
    let single = 0;
    for (let r = 0; r < restRowOf(L); r++) {
      single = L[r].length === 1 ? single + 1 : 0;
      expect(single, `${r}行`).toBeLessThan(3);
    }
  });

  // 2026-11-13（点検19の問題 A1）: 1つ目の鍵の型は、シナリオ2〜7の6か所。選ぶ所は 6 以上（直す前 bf628d5 と同じ数）。
  // 宝箱の格（コモン・鍵付きのレア）は残す。シナリオ1の翠の神殿は、この型ではない（ふつうの戦闘は 3回以上のまま）
  it('1つ目の鍵の型: シナリオ2〜7の6か所・選ぶ所 6 以上・宝箱の格は残す', () => {
    const k1 = fixed().filter(isKeyLayout1);
    expect(k1.map((d) => DUNGEONS.scenarioOf(d.id)).sort()).toEqual(SCENARIOS.all.map((s) => s.id).filter((s) => s !== 'corruptionKing').sort());
    for (const d of k1) {
      expect(keyed(DUNGEONS.scenarioOf(d.id)!)[0].id).toBe(d.id);
      expect(d.layout!.flat().filter((x) => x.next.length >= 2).length, d.id).toBeGreaterThanOrEqual(6);
      const chests = d.layout!.flat().filter((x) => x.type === 'chest').map((x) => `${x.chest!.rarity}${x.chest!.locked ? '鍵' : ''}`);
      expect(chests.sort(), d.id).toEqual(['common', 'rare鍵']);
    }
  });

  // 同じ型の写し（シナリオ2〜7）は、イベントが違うだけで、ほかのシナリオのイベントを借りない（同じダンジョンで同じイベントを2回使わない）
  it.each(fixed().map((d) => [d.id, d] as const))('%s: イベントはそのシナリオの物・同じダンジョンで重ならない', (id, d) => {
    const ids = d.layout!.flat().filter((x) => x.type === 'event').map((x) => x.eventId!);
    expect(new Set(ids).size).toBe(ids.length);
    const sid = DUNGEONS.scenarioOf(id);
    for (const e of ids) expect(EVENTS.forScenario(sid!).some((x) => x.id === e), e).toBe(true);
  });
});

/** 同じ種類（扉の予兆と同じ分け方）の部屋が続いている所（無ければ undefined。憲章3。2026-11-13） */
function sameKindOf(path: string[]): string | undefined {
  for (let i = 1; i < path.length; i++) if (roomKind(path[i]) === roomKind(path[i - 1])) return `${path[i - 1]}→${path[i]}（${i}行目）`;
  return undefined;
}

describe('ランダムダンジョンの偏り防止', () => {
  it('種を変えても、どの道でも同じ種類の部屋が続かない（扉の予兆と同じ分け方。2026-11-13 に全部の種類へ広げた）。行の数は 4＋ボス', () => {
    const randoms = DUNGEONS.all.filter((d) => d.random);
    expect(randoms).toHaveLength(7);
    let layouts = 0;
    let rowDups = 0;
    let multiRows = 0;
    for (const d of randoms) {
      const eventIds = EVENTS.forScenario(DUNGEONS.scenarioOf(d.id)!)
        .filter((e) => e.where !== 'map' && e.where !== 'spawn')
        .map((e) => e.id);
      for (const theme of [undefined, 'crystalGrotto', 'sealedLabyrinth', 'outlawDen']) {
        for (let seed = 1; seed <= 100; seed++) {
          const run = buildDungeon(d.id, createRng(seed * 7919 + 13), 0, eventIds, theme);
          layouts++;
          expect(dungeonRows(run)).toBe(5);
          expect(isLegacyLayout(run)).toBe(false);
          expect(run.rooms[0].type).toBe('battle');
          // どの辺も、同じ type ではない・同じ種類（予兆）でもない
          const by = new Map(run.rooms.map((r) => [r.id, r]));
          for (const room of run.rooms) for (const n of room.next) expect(roomKind(by.get(n)!.type), `${d.id} ${theme} seed${seed}: ${room.id}→${n}`).not.toBe(roomKind(room.type));
          const layout: Layout = [];
          for (const room of run.rooms) (layout[room.row] ??= [])[room.col] = { type: room.type, next: room.next.map((id) => Number(id.split('c')[1])) };
          for (const p of allPaths(layout)) expect(sameKindOf(p), `${d.id} seed${seed}: ${p.join('→')}`).toBeUndefined();
          // 同じ行の部屋は、なるべく全部ちがう type（1行目の戦闘は除く。出せる種類が足りない時だけ重なる）
          layout.forEach((row, r) => {
            if (r > 0 && row.length > 1 && new Set(row.map((x) => x.type)).size < row.length) rowDups++;
            if (r > 0 && row.length > 1) multiRows++;
          });
          // テーマの部屋は最後の行（ボスの前）に1つ
          if (theme) expect(layout[3].map((r) => r.type)).toEqual([getRoomType(DUNGEON_THEMES.get(theme).fixedRoom).id]);
        }
      }
    }
    expect(layouts).toBe(2800);
    // 2026-11-13 の測定: 部屋が2つ以上の行 3955 のうち、重なりは 49（前は 2191）。2% を超えたら作り方を見直す
    expect(multiRows).toBeGreaterThan(3000);
    expect(rowDups / multiRows).toBeLessThan(0.02);
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
