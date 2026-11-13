// つまみの測定（2026-11-13）: 難しさを測るための入れ物（BALANCE の breakPerfectByRank・breakNeedsWeakPerfect・breakStatus・breakClearsBlock・
// enemyAttackByRegion・enemyHpByRank・goldGainMul）。どれも既定は「今と同じ動き」。ここでは「既定では変わらない」「値を入れると効く」
// 「カードと道具で崩す物は、どの決まりでも今のまま」を確かめる（値は試しに入れて、最後に必ず戻す）
import { afterEach, describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { ENEMIES } from '../../data/enemies';
import type { BattleState, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, createRng, startBattleWith } from '../index';
import { breakEnemy, makeCtx, perfectAloneBreaks } from '../battle/effects';
import { earnGold } from '../game/common';
import { giveHand, party, play } from './helpers';

type Mutable = Record<string, unknown>;
const B = BALANCE as unknown as Mutable;
const SAVED = Object.fromEntries(['breakPerfectByRank', 'breakNeedsWeakPerfect', 'breakStatus', 'breakClearsBlock', 'breakDamagePctByRank', 'enemyAttackByRegion', 'enemyHpByRank', 'enemyHpByRegion', 'goldGainMul'].map((k) => [k, B[k]]));
afterEach(() => Object.assign(B, SAVED));

/** 1体だけの戦闘（大技の予告を出させる）。flags で格を決める */
function one(defId: string, actionId: string, seed: number, flags: { boss?: boolean; midboss?: boolean; elite?: boolean } = {}): BattleState {
  const s = createBattle({ seed, party: party('warrior', 'mage'), encounter: { id: 't', name: 't', enemies: [{ defId, level: 10 }], ...flags } });
  s.enemies[0].hp = s.enemies[0].maxHp = 100000;
  for (const a of s.allies) { a.hp = a.maxHp = 9999; a.mana = 10; }
  s.enemies[0].intent = { actionId, targetId: 'a0' };
  return s;
}
const gate = (seed: number, flags: Parameters<typeof one>[3] = {}) => one('gatekeeper', 'crush', seed, flags);
const whys = (events: { type: string }[]) => (events.filter((e) => e.type === 'break') as unknown as { why: string }[]).map((e) => e.why);

/** 完全成功のヘビースイング（弱点ではない一撃） */
function perfectHit(flags: Parameters<typeof one>[3] = {}) {
  const s = gate(5, flags);
  const [card] = giveHand(s, 'a0', ['heavySwing']);
  s.allies[0].focus = 3;
  return whys(applyCommand(s, play('a0', card.uid, 'e0', 3)).events);
}
/** 雷（門番ガルザの弱点）の一撃。perfect = フォーカスを全部の枠に入れる */
function weakHit(perfect: boolean) {
  for (let seed = 1; seed < 80; seed++) {
    const s = gate(seed);
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
/** 魔力の楔（成功1でも崩せる）。フォーカス1 */
function wedge(flags: Parameters<typeof one>[3] = {}) {
  const s = gate(3, flags);
  const [card] = giveHand(s, 'a1', ['axManaWedge']);
  s.allies[1].focus = 1;
  const r = applyCommand(s, play('a1', card.uid, 'e0', 1));
  expect(r.error).toBeUndefined();
  return whys(r.events);
}

describe('BREAK の決まりのつまみ（既定 = 今のまま）', () => {
  it('既定の値', () => {
    expect(BALANCE.breakPerfectByRank).toEqual({});
    expect(BALANCE.breakNeedsWeakPerfect).toBe(false);
    expect(BALANCE.breakStatus).toBe('weak');
    expect(BALANCE.breakClearsBlock).toBe(true);
    expect(BALANCE.enemyAttackByRegion).toEqual({});
    expect(BALANCE.enemyHpByRank).toEqual({});
    expect(BALANCE.goldGainMul).toBe(1);
  });

  it('既定では、完全成功・弱点（完全成功でなくても）・魔力の楔で、どの格でも崩れる', () => {
    for (const f of [{}, { boss: true }, { midboss: true }, { elite: true }]) {
      expect(perfectHit(f)).toEqual(['perfect']);
      expect(wedge(f)).toEqual(['perfect']);
    }
    expect(weakHit(false)).toEqual(['weak']);
    expect(weakHit(true)).toEqual(['weak']);
  });

  it('B1: ボス・中ボスは完全成功だけでは崩れない（強敵・ふつうは崩れる）。魔力の楔は崩せる', () => {
    B.breakPerfectByRank = { boss: false, midboss: false };
    expect(perfectHit({ boss: true })).toEqual([]);
    expect(perfectHit({ midboss: true })).toEqual([]);
    expect(perfectHit({ elite: true })).toEqual(['perfect']);
    expect(perfectHit({})).toEqual(['perfect']);
    expect(wedge({ boss: true })).toEqual(['perfect']);
  });

  it('B2: 全部の敵で完全成功だけでは崩れない。弱点・魔力の楔は崩せる', () => {
    B.breakPerfectByRank = { boss: false, midboss: false, elite: false, normal: false };
    expect(perfectHit({})).toEqual([]);
    expect(weakHit(false)).toEqual(['weak']);
    expect(wedge({})).toEqual(['perfect']);
  });

  it('B3: 弱点で、しかも完全成功の時だけ崩れる。弱点の無い敵は完全成功で崩れる。魔力の楔は崩せる', () => {
    B.breakNeedsWeakPerfect = true;
    B.breakDamagePctByRank = { boss: Infinity, midboss: Infinity, elite: Infinity, normal: Infinity };
    expect(perfectHit({})).toEqual([]);
    expect(weakHit(false)).toEqual([]);
    expect(weakHit(true)).toEqual(['weak']);
    expect(wedge({})).toEqual(['perfect']);
    // 弱点を持たない敵（大技を持つ物）
    const noWeak = ENEMIES.all.find((e) => !e.weak?.length && e.actions.some((x) => x.big));
    expect(noWeak).toBeDefined();
    const s = one(noWeak!.id, noWeak!.actions.find((x) => x.big)!.id, 5);
    expect(perfectAloneBreaks(s, s.enemies[0])).toBe(true);
    expect(perfectAloneBreaks(gate(5), gate(5).enemies[0])).toBe(false);
  });

  it('B4: 崩した時に脆弱を付け、弱体は付けず、ブロックは残す（既定は弱体・ブロック0）', () => {
    const run = () => {
      const s = gate(1);
      s.enemies[0].block = 7;
      const ctx = makeCtx(s, createRng(1), [], s.allies[0], {});
      breakEnemy(ctx, s.enemies[0], 'perfect');
      return s.enemies[0];
    };
    const d = run();
    expect([d.statuses.weak, d.statuses.vulnerable ?? 0, d.block, d.nextActionMultiplier]).toEqual([1, 0, 0, 0.5]);
    B.breakStatus = 'vulnerable';
    B.breakClearsBlock = false;
    const v = run();
    expect([v.statuses.weak ?? 0, v.statuses.vulnerable, v.block, v.nextActionMultiplier]).toEqual([0, 1, 7, 0.5]);
  });
});

describe('敵の強さ・お金のつまみ（既定 = 今のまま）', () => {
  const start = (roomType = 'battle') => {
    const g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' as PlayerId }] });
    g.party = g.heroes.map((h) => h.id);
    startBattleWith(g, [{ defId: 'goblinScout', level: 1 }], roomType, createRng(1));
    return g.battle!.enemies[0];
  };
  it('地域ごとの攻撃の倍率: 始まりの地域に入れると、その分だけ攻撃が上がる（ほかの地域では変わらない）', () => {
    const base = start().attackMul;
    B.enemyAttackByRegion = { volcano: 2 };
    expect(start().attackMul).toBe(base);
    B.enemyAttackByRegion = { plains: 2 };
    expect(start().attackMul).toBeCloseTo(base * 2);
  });
  it('格ごとのHPの倍率: ボスの部屋だけに入れると、ボスの部屋の戦闘だけHPが増える', () => {
    const base = start('battle').maxHp;
    const bossBase = start('boss').maxHp;
    B.enemyHpByRank = { boss: 2 };
    expect(start('battle').maxHp).toBe(base);
    expect(start('boss').maxHp).toBeGreaterThanOrEqual(bossBase * 2 - 1);
  });
  it('稼いだお金の倍率（既定では変わらない。0.5 なら半分・切り捨て）', () => {
    const g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' as PlayerId }] });
    const h = g.heroes[0];
    const g0 = h.gold;
    earnGold(h, 51);
    expect(h.gold).toBe(g0 + 51);
    B.goldGainMul = 0.5;
    earnGold(h, 51);
    expect(h.gold).toBe(g0 + 51 + 25);
  });
});
