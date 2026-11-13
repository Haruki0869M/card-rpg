// 回4（難しさの測定）: 敵の格ごとの BREAK の線（BALANCE.breakDamagePctByRank）と、地域ごとの敵のHPの倍率（BALANCE.enemyHpByRegion）。
// どちらも既定は空 = 今と同じ動き。ここでは「既定では変わらない」「値を入れると効く」を確かめる（値は試しに入れて、最後に必ず戻す）
import { afterEach, describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import type { BattleState, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, createRng, startBattleWith } from '../index';
import { breakDamagePctOf } from '../battle/effects';
import { giveHand, party, play } from './helpers';

type Mutable = { breakDamagePctByRank: Record<string, number>; enemyHpByRegion: Record<string, number>; breakNeedsWeakPerfect: boolean; breakNeedsWeakPerfectRanks?: string[] };
const B = BALANCE as unknown as Mutable;
const SAVED = { breakDamagePctByRank: B.breakDamagePctByRank, enemyHpByRegion: B.enemyHpByRegion, breakNeedsWeakPerfect: B.breakNeedsWeakPerfect, breakNeedsWeakPerfectRanks: B.breakNeedsWeakPerfectRanks };
afterEach(() => Object.assign(B, SAVED));
/**
 * 案Y を既定に入れた（2026-11-13）: 大物は「弱点で、しかも完全成功」・合計ダメージでは崩れない（planY.test.ts）。
 * ここの「線を格ごとに変える入れ物」の確かめは、前の既定（どの格も 20%・完全成功で崩れる）に戻してから流す（テストの前提だけ直した）
 */
const oldRules = () => {
  B.breakDamagePctByRank = {};
  B.breakNeedsWeakPerfect = false;
  B.breakNeedsWeakPerfectRanks = undefined;
};

/** 門番ガルザ1体（大技 = 大斧の一撃）。格は flags で決める */
function gate(seed: number, flags: { boss?: boolean; midboss?: boolean; elite?: boolean } = {}): BattleState {
  const s = createBattle({ seed, party: party('warrior', 'mage'), encounter: { id: 't', name: 't', enemies: [{ defId: 'gatekeeper', level: 10 }], ...flags } });
  s.enemies[0].hp = s.enemies[0].maxHp = 1000;
  for (const a of s.allies) a.hp = a.maxHp = 9999;
  s.enemies[0].intent = { actionId: 'crush', targetId: 'a0' };
  return s;
}
const breaks = (events: { type: string }[]) => events.filter((e) => e.type === 'break') as { type: 'break'; why: string }[];

/** 完全成功でない一撃を1回打って、その一撃がちょうど最大HPの25%になるように敵のHPを合わせた戦闘で、BREAK したか */
function hit25(flags: Parameters<typeof gate>[1]): string[] {
  for (let seed = 1; seed < 60; seed++) {
    const probe = gate(seed, flags);
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
    return breaks(applyCommand(s, play('a0', c2.uid, 'e0', 0)).events).map((e) => e.why);
  }
  throw new Error('完全成功でない種が見つからない');
}

describe('敵の格ごとの BREAK の線（回4・測るための切り替え）', () => {
  it('既定（案Y）では、ボス・中ボスは合計ダメージでは崩れない（∞）。強敵・ふつうは breakDamagePct（20%）のまま', () => {
    expect(breakDamagePctOf({ boss: true })).toBe(Infinity);
    expect(breakDamagePctOf({ midboss: true })).toBe(Infinity);
    expect(breakDamagePctOf({ elite: true })).toBe(BALANCE.breakDamagePct);
    expect(breakDamagePctOf({})).toBe(BALANCE.breakDamagePct);
    expect(hit25({ boss: true })).toEqual([]);
    expect(hit25({ elite: true })).toEqual(['damage']);
  });

  it('入れ物が空（前の既定）なら、どの格も breakDamagePct（20%）のまま', () => {
    oldRules();
    for (const f of [{}, { boss: true }, { midboss: true }, { elite: true }]) expect(breakDamagePctOf(f)).toBe(BALANCE.breakDamagePct);
    // 25% の一撃は、どの格でも崩れる（今と同じ）
    expect(hit25({})).toEqual(['damage']);
    expect(hit25({ boss: true })).toEqual(['damage']);
  });

  it('ボスだけ線を 30% にすると、25% の一撃でボスは崩れず、ふつうの敵は崩れる', () => {
    oldRules();
    B.breakDamagePctByRank = { boss: 30, midboss: 30, elite: 25 };
    expect(breakDamagePctOf({ boss: true })).toBe(30);
    expect(breakDamagePctOf({ midboss: true })).toBe(30);
    expect(breakDamagePctOf({ elite: true })).toBe(25);
    expect(breakDamagePctOf({})).toBe(20);
    expect(hit25({ boss: true })).toEqual([]);
    expect(hit25({ midboss: true })).toEqual([]);
    expect(hit25({ elite: true })).toEqual(['damage']);
    expect(hit25({})).toEqual(['damage']);
  });

  it('Infinity にすると、合計ダメージでは崩れない（前の既定の決まりなら、完全成功では崩れる）', () => {
    oldRules();
    B.breakDamagePctByRank = { boss: Infinity };
    expect(hit25({ boss: true })).toEqual([]);
    const s = gate(5, { boss: true });
    const [card] = giveHand(s, 'a0', ['heavySwing', 'heavySwing']);
    s.allies[0].focus = 3;
    expect(breaks(applyCommand(s, play('a0', card.uid, 'e0', 3)).events).map((e) => e.why)).toEqual(['perfect']);
  });

  it('createBattle は、強敵の部屋の印を戦闘に持たせる（ボス・中ボスと同じ形）', () => {
    expect(gate(1, { elite: true }).elite).toBe(true);
    expect(gate(1).elite).toBeUndefined();
  });
});

describe('地域ごとの敵のHPの倍率（回4・測るための切り替え）', () => {
  const start = () => {
    const g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' as PlayerId }] });
    g.party = g.heroes.map((h) => h.id);
    startBattleWith(g, [{ defId: 'goblinScout', level: 1 }], 'battle', createRng(1));
    return g.battle!.enemies[0].maxHp;
  };
  it('既定（空）では変わらず、始まりの地域に倍率を入れると、その分HPが増える', () => {
    expect(BALANCE.enemyHpByRegion).toEqual({});
    const base = start();
    B.enemyHpByRegion = { volcano: 3 };
    expect(start()).toBe(base);
    B.enemyHpByRegion = { plains: 3 };
    expect(start()).toBeGreaterThanOrEqual(base * 3 - 1);
  });
});
