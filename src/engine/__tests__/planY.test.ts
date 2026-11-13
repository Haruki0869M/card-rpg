// 案Y（2026-11-13 オーナーの決定）を既定の値に入れた事を確かめる:
// - BA: ボス・中ボス・災厄は「弱点の属性で、しかも完全成功」の時だけ崩れる（完全成功だけ・弱点だけ・合計ダメージでは崩れない）。
//       弱点を持たない大物は完全成功で崩れる。強敵・ふつうの敵は今までどおり。魔力の楔・閃光の破砕玉のように「崩す」力は、どの格でも崩せる
// - H4: ボス・中ボス・災厄の HP ×2
// - A2: 7本のシナリオとも、進む順で3つ目の地域より後（3つ目を含む）の敵の攻撃 ×1.5（3つ目より前の地域は ×1）
// 説明の文が決まりの関数（breakRules.ts の breakRuleOf）から作られている事も、ここで確かめる
import { afterEach, describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { ENEMIES } from '../../data/enemies';
import { getItem } from '../../data/items';
import { SCENARIOS, getScenario } from '../../data/scenarios';
import type { BattleState, GameState, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, createRng, startBattleWith } from '../index';
import { breakRuleOf } from '../battle/breakRules';
import { breakHowText, intentView } from '../../components/format';
import { giveHand, party, play } from './helpers';

type Mutable = Record<string, unknown>;
const B = BALANCE as unknown as Mutable;
const SAVED = Object.fromEntries(['enemyAttackByRegion', 'enemyHpByRank'].map((k) => [k, B[k]]));
afterEach(() => Object.assign(B, SAVED));

type Flags = { boss?: boolean; midboss?: boolean; elite?: boolean };
/** 門番ガルザ（弱点 = 雷）1体。大技「大斧の一撃」を予告させる。flags で格を決める */
function gate(seed: number, flags: Flags = {}): BattleState {
  const s = createBattle({ seed, party: party('warrior', 'mage'), encounter: { id: 't', name: 't', enemies: [{ defId: 'gatekeeper', level: 10 }], ...flags } });
  s.enemies[0].hp = s.enemies[0].maxHp = 100000;
  for (const a of s.allies) { a.hp = a.maxHp = 9999; a.mana = 10; }
  s.enemies[0].intent = { actionId: 'crush', targetId: 'a0' };
  return s;
}
const whys = (events: { type: string }[]) => (events.filter((e) => e.type === 'break') as unknown as { why: string }[]).map((e) => e.why);

/** 完全成功のヘビースイング（弱点ではない一撃） */
function perfectHit(flags: Flags) {
  const s = gate(5, flags);
  const [card] = giveHand(s, 'a0', ['heavySwing']);
  s.allies[0].focus = 3;
  return whys(applyCommand(s, play('a0', card.uid, 'e0', 3)).events);
}
/** 雷（門番ガルザの弱点）の一撃。perfect = 完全成功になった種で */
function weakHit(flags: Flags, perfect: boolean) {
  for (let seed = 1; seed < 80; seed++) {
    const s = gate(seed, flags);
    const [card] = giveHand(s, 'a1', ['gambleBolt']);
    s.allies[1].focus = s.allies[1].focusMax = 4;
    const r = applyCommand(s, play('a1', card.uid, 'e0', perfect ? 4 : 0));
    expect(r.error).toBeUndefined();
    const roll = r.events.find((e) => e.type === 'roll');
    if (roll?.type !== 'roll' || roll.perfect !== perfect) continue;
    return whys(r.events);
  }
  throw new Error('種が見つからない');
}
/** 完全成功でない一撃で、ちょうど最大HPの25%を与える（合計ダメージの線 20% を越える） */
function damage25(flags: Flags) {
  for (let seed = 1; seed < 60; seed++) {
    const probe = gate(seed, flags);
    probe.enemies[0].hp = probe.enemies[0].maxHp = 1000;
    const [card] = giveHand(probe, 'a0', ['heavySwing']);
    probe.allies[0].focus = 0;
    const r = applyCommand(probe, play('a0', card.uid, 'e0', 0));
    const roll = r.events.find((e) => e.type === 'roll');
    if (roll?.type !== 'roll' || roll.perfect) continue;
    const dealt = 1000 - r.state.enemies[0].hp;
    const s = gate(seed, flags);
    s.enemies[0].maxHp = s.enemies[0].hp = dealt * 4;
    const [c2] = giveHand(s, 'a0', ['heavySwing']);
    s.allies[0].focus = 0;
    return whys(applyCommand(s, play('a0', c2.uid, 'e0', 0)).events);
  }
  throw new Error('完全成功でない種が見つからない');
}
/** 魔力の楔（成功1でも崩せる） */
function wedge(flags: Flags) {
  const s = gate(3, flags);
  const [card] = giveHand(s, 'a1', ['axManaWedge']);
  s.allies[1].focus = 1;
  const r = applyCommand(s, play('a1', card.uid, 'e0', 1));
  expect(r.error).toBeUndefined();
  return whys(r.events);
}

const BIG: [string, Flags][] = [['ボス', { boss: true }], ['中ボス・災厄', { midboss: true }]];
const SMALL: [string, Flags][] = [['強敵', { elite: true }], ['ふつう', {}]];

describe('案Y の BREAK（既定の値）', () => {
  it('既定の値が案Y になっている', () => {
    expect(BALANCE.breakNeedsWeakPerfect).toBe(true);
    expect(BALANCE.breakNeedsWeakPerfectRanks).toEqual(['boss', 'midboss']);
    expect(BALANCE.breakDamagePctByRank).toEqual({ boss: Infinity, midboss: Infinity });
    expect(BALANCE.enemyHpByRank).toEqual({ boss: 2, midboss: 2 });
    // 測るだけのつまみは、今も使っていない
    expect(BALANCE.breakPerfectNoWeakCard).toBe(false);
    expect(BALANCE.breakPerfectHeavy).toBeUndefined();
    expect(BALANCE.breakPerfectByRank).toEqual({});
  });

  for (const [name, f] of BIG) {
    it(`${name}: 完全成功だけ・弱点だけ・合計ダメージでは崩れない。弱点で完全成功なら崩れる。魔力の楔は崩せる`, () => {
      expect(perfectHit(f)).toEqual([]);
      expect(weakHit(f, false)).toEqual([]);
      expect(damage25(f)).toEqual([]);
      expect(weakHit(f, true)).toEqual(['weak']);
      expect(wedge(f)).toEqual(['perfect']);
    });
  }

  for (const [name, f] of SMALL) {
    it(`${name}: 今までどおり、完全成功・弱点（完全成功でなくても）・合計ダメージのどれでも崩れる`, () => {
      expect(perfectHit(f)).toEqual(['perfect']);
      expect(weakHit(f, false)).toEqual(['weak']);
      expect(weakHit(f, true)).toEqual(['weak']);
      expect(damage25(f)).toEqual(['damage']);
      expect(wedge(f)).toEqual(['perfect']);
    });
  }

  it('弱点を持たない大物は、完全成功で崩れる（合計ダメージでは崩れない）', () => {
    const noWeak = ENEMIES.all.find((e) => !e.weak?.length && e.actions.some((x) => x.big))!;
    expect(noWeak).toBeDefined();
    const s = createBattle({ seed: 5, party: party('warrior', 'mage'), encounter: { id: 't', name: 't', enemies: [{ defId: noWeak.id, level: 10 }], boss: true } });
    s.enemies[0].hp = s.enemies[0].maxHp = 100000;
    s.enemies[0].intent = { actionId: noWeak.actions.find((x) => x.big)!.id, targetId: 'a0' };
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    s.allies[0].focus = 3;
    expect(whys(applyCommand(s, play('a0', card.uid, 'e0', 3)).events)).toEqual(['perfect']);
    const rule = breakRuleOf(s, s.enemies[0]);
    expect(rule).toMatchObject({ weakAndPerfect: false, perfectAlone: true });
    expect(rule.damagePct).toBeUndefined();
    expect(breakHowText(s, s.enemies[0])).toBe('完全成功で攻撃した時に体勢を崩せる（大きなダメージでは崩れない）');
  });

  it('閃光の破砕玉（崩す道具）は、ボスでも崩せる', () => {
    for (const f of [{ boss: true }, { midboss: true }]) {
      const s = gate(3, f);
      const def = getItem('flashShard');
      const r = applyCommand(s, { type: 'USE_ITEM', playerId: 'P1', characterId: 'a0', targetId: 'e0', itemName: def.name, effects: def.use! });
      expect(r.error).toBeUndefined();
      expect(r.state.enemies[0].broken).toBe(true);
    }
  });

  it('説明の文は決まりの関数から作る（大物 = 弱点で完全成功の時だけ・ほか = どれか）', () => {
    const big = gate(1, { boss: true });
    expect(breakRuleOf(big, big.enemies[0])).toMatchObject({ weak: ['thunder'], weakAndPerfect: true, perfectAlone: false, weakAlone: false });
    expect(breakHowText(big, big.enemies[0])).toBe('ボス・中ボス・災厄の大技は、弱点の属性（雷）で、しかも完全成功で攻撃した時だけ体勢を崩せる（完全成功だけ・大きなダメージでは崩れない）');
    expect(intentView(big, big.enemies[0])!.details[0]).toContain('弱点の属性（雷）で、しかも完全成功');
    const small = gate(1, { elite: true });
    expect(breakRuleOf(small, small.enemies[0])).toMatchObject({ weakAndPerfect: false, perfectAlone: true, weakAlone: true, damagePct: BALANCE.breakDamagePct });
    expect(breakHowText(small, small.enemies[0])).toBe(`弱点の属性（雷）で攻撃・完全成功で攻撃・このターンに最大HPの${BALANCE.breakDamagePct}%のダメージ、のどれかで体勢を崩せる`);
  });
});

describe('案Y の敵の強さ（既定の値）', () => {
  const newGame = (scenarioId: string) => {
    const g = createGame({ seed: 7, scenarioId, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' as PlayerId }] });
    g.party = g.heroes.map((h) => h.id);
    return g;
  };
  const startAt = (g: GameState, tile: number | undefined, roomType = 'battle') => {
    const gg = structuredClone(g);
    if (tile !== undefined) gg.world!.pos[gg.heroes[0].id] = tile;
    startBattleWith(gg, [{ defId: 'goblinScout', level: 1 }], roomType, createRng(1));
    return gg.battle!.enemies[0];
  };

  it('ボス・中ボス（災厄）の HP は ×2。強敵・ふつうは変わらない', () => {
    const g = newGame('corruptionKing');
    const now = Object.fromEntries(['boss', 'midboss', 'scourge', 'elite', 'battle'].map((t) => [t, startAt(g, undefined, t).maxHp]));
    B.enemyHpByRank = {};
    const before = Object.fromEntries(['boss', 'midboss', 'scourge', 'elite', 'battle'].map((t) => [t, startAt(g, undefined, t).maxHp]));
    for (const t of ['boss', 'midboss', 'scourge']) {
      expect(now[t]).toBeGreaterThanOrEqual(before[t] * 2 - 1);
      expect(now[t]).toBeLessThanOrEqual(before[t] * 2 + 1);
    }
    expect(now.elite).toBe(before.elite);
    expect(now.battle).toBe(before.battle);
  });

  it('7本とも: 地域の id は重ならず、進む順で3つ目の地域より後（3つ目を含む）だけが ×1.5（測定の SIM_KNOBS=A2 と同じ当て方）', () => {
    const seen = new Set<string>();
    const table = BALANCE.enemyAttackByRegion;
    expect(SCENARIOS.all.length).toBe(7);
    for (const sc of SCENARIOS.all) {
      const regions = getScenario(sc.id).map!.regions;
      // 地図の regions は上（最後の地域）から下（始まりの地域）の順。下の2つを除いた物が「3つ目より後」
      const late = regions.slice(0, regions.length - 2).map((r) => r.id);
      const early = regions.slice(regions.length - 2).map((r) => r.id);
      expect(late.length).toBeGreaterThanOrEqual(3);
      for (const r of regions) {
        expect(seen.has(r.id)).toBe(false);
        seen.add(r.id);
      }
      for (const id of late) expect(table[id], `${sc.id} ${id}`).toBe(1.5);
      for (const id of early) expect(table[id], `${sc.id} ${id}`).toBeUndefined();
    }
    // 表に、どのシナリオにも無い地域の id が入っていない
    for (const id of Object.keys(table)) expect(seen.has(id), id).toBe(true);
  });

  it('7本とも: 実際の戦闘で、3つ目より後の地域の敵の攻撃は ×1.5、3つ目より前は ×1', () => {
    for (const sc of SCENARIOS.all) {
      const g = newGame(sc.id);
      const regions = getScenario(sc.id).map!.regions;
      regions.forEach((reg, ri) => {
        const tile = g.world!.tiles.findIndex((t) => t.r === ri);
        expect(tile, `${sc.id} ${reg.id}`).toBeGreaterThanOrEqual(0);
        const now = startAt(g, tile).attackMul;
        B.enemyAttackByRegion = {};
        const before = startAt(g, tile).attackMul;
        B.enemyAttackByRegion = SAVED.enemyAttackByRegion as Record<string, number>;
        const late = ri < regions.length - 2;
        expect(now / before, `${sc.id} ${reg.id}`).toBeCloseTo(late ? 1.5 : 1);
      });
    }
  });
});
