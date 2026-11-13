// BREAK を読み合いにする（2026-11-13 オーナーの決定・docs/tasks/break-read-plan.md §2）の決まりを確かめる。
// （前の名前は planY.test.ts。案Y の「大物のHP ×2・後半の攻撃 ×1.5」は取りやめたので、そのテストは外し、紫の札のテストを足した）
// | 予告 | 崩せる条件 |
// | ふつうの敵・強敵の赤い大技 | 今までどおり（弱点で攻撃／完全成功／合計ダメージ） |
// | 紫の札（behavior 付きの行動。どの戦闘でも） | 弱点の属性で、しかも完全成功（合計ダメージでは崩れない） |
// | ボス・中ボス・災厄の大技 | 弱点の属性で、しかも完全成功（合計ダメージでは崩れない） |
// | 弱点を持たない敵 | 完全成功で崩れる |
// 「弱点扱い」（弱点看破の印など）は弱点として数える。魔力の楔・閃光の破砕玉は、どれでも今のまま崩せる。
// 説明の文が決まりの関数（breakRules.ts の breakRuleOf）から作られている事も、ここで確かめる
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { ENEMIES } from '../../data/enemies';
import { getItem } from '../../data/items';
import type { BattleState } from '../../types';
import { applyCommand, createBattle } from '../index';
import { breakRuleOf } from '../battle/breakRules';
import { breakHowText, intentView } from '../../components/format';
import { giveHand, party, play } from './helpers';

type Flags = { boss?: boolean; midboss?: boolean; elite?: boolean };
/** 予告する敵と行動: red = 門番ガルザ（弱点 = 雷）の赤い大技「大斧の一撃」 / purple = 泥のスライム（弱点 = 雷）の紫の札「浄化の脱皮」 */
type Foe = { defId: string; actionId: string };
const RED: Foe = { defId: 'gatekeeper', actionId: 'crush' };
const PURPLE: Foe = { defId: 'mireSlime', actionId: 'harden' };

function gate(seed: number, flags: Flags = {}, foe: Foe = RED): BattleState {
  const s = createBattle({ seed, party: party('warrior', 'mage'), encounter: { id: 't', name: 't', enemies: [{ defId: foe.defId, level: 10 }], ...flags } });
  s.enemies[0].hp = s.enemies[0].maxHp = 100000;
  for (const a of s.allies) { a.hp = a.maxHp = 9999; a.mana = 10; }
  s.enemies[0].intent = { actionId: foe.actionId, targetId: 'a0' };
  return s;
}
const whys = (events: { type: string }[]) => (events.filter((e) => e.type === 'break') as unknown as { why: string }[]).map((e) => e.why);

/** 完全成功のヘビースイング（弱点ではない一撃）。exposed = 弱点看破の印を付けておく */
function perfectHit(flags: Flags, foe: Foe = RED, exposed = false) {
  const s = gate(5, flags, foe);
  if (exposed) s.enemies[0].exposed = true;
  const [card] = giveHand(s, 'a0', ['heavySwing']);
  s.allies[0].focus = 3;
  return whys(applyCommand(s, play('a0', card.uid, 'e0', 3)).events);
}
/** 雷（どちらの敵も弱点）の一撃。perfect = 完全成功になった種で */
function weakHit(flags: Flags, perfect: boolean, foe: Foe = RED) {
  for (let seed = 1; seed < 80; seed++) {
    const s = gate(seed, flags, foe);
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
function damage25(flags: Flags, foe: Foe = RED) {
  for (let seed = 1; seed < 60; seed++) {
    const probe = gate(seed, flags, foe);
    probe.enemies[0].hp = probe.enemies[0].maxHp = 1000;
    const [card] = giveHand(probe, 'a0', ['heavySwing']);
    probe.allies[0].focus = 0;
    const r = applyCommand(probe, play('a0', card.uid, 'e0', 0));
    const roll = r.events.find((e) => e.type === 'roll');
    if (roll?.type !== 'roll' || roll.perfect) continue;
    const dealt = 1000 - r.state.enemies[0].hp;
    const s = gate(seed, flags, foe);
    s.enemies[0].maxHp = s.enemies[0].hp = dealt * 4;
    const [c2] = giveHand(s, 'a0', ['heavySwing']);
    s.allies[0].focus = 0;
    return whys(applyCommand(s, play('a0', c2.uid, 'e0', 0)).events);
  }
  throw new Error('完全成功でない種が見つからない');
}
/** 魔力の楔（成功1でも崩せる） */
function wedge(flags: Flags, foe: Foe = RED) {
  const s = gate(3, flags, foe);
  const [card] = giveHand(s, 'a1', ['axManaWedge']);
  s.allies[1].focus = 1;
  const r = applyCommand(s, play('a1', card.uid, 'e0', 1));
  expect(r.error).toBeUndefined();
  return whys(r.events);
}
/** 閃光の破砕玉（崩す道具） */
function flash(flags: Flags, foe: Foe = RED) {
  const s = gate(3, flags, foe);
  const def = getItem('flashShard');
  const r = applyCommand(s, { type: 'USE_ITEM', playerId: 'P1', characterId: 'a0', targetId: 'e0', itemName: def.name, effects: def.use! });
  expect(r.error).toBeUndefined();
  return r.state.enemies[0].broken;
}

const BIG: [string, Flags][] = [['ボス', { boss: true }], ['中ボス・災厄', { midboss: true }]];
const SMALL: [string, Flags][] = [['強敵', { elite: true }], ['ふつう', {}]];

describe('BREAK の決まり（既定の値）', () => {
  it('既定の値が計画の形になっている（案Y の敵の強さは外した）', () => {
    expect(BALANCE.breakNeedsWeakPerfect).toBe(true);
    expect(BALANCE.breakNeedsWeakPerfectRanks).toEqual(['boss', 'midboss']);
    expect(BALANCE.breakDamagePctByRank).toEqual({ boss: Infinity, midboss: Infinity });
    expect(BALANCE.breakBehaviorNeedsWeakPerfect).toBe(true);
    expect(BALANCE.breakDamagePctBehavior).toBe(Infinity);
    // 案Y の取りやめ: 大物のHP ×2・後半の地域の攻撃 ×1.5 は入れない（入れ物は空）
    // （2026-11-13 強敵の計画 柱2 で、強敵の本体だけのHPの倍率 elite を入れた。大物には入れない）
    expect(BALANCE.enemyHpByRank.boss).toBeUndefined();
    expect(BALANCE.enemyHpByRank.midboss).toBeUndefined();
    expect(BALANCE.enemyAttackByRegion).toEqual({});
    // 測るだけのつまみは、今も使っていない
    expect(BALANCE.breakPerfectNoWeakCard).toBe(false);
    expect(BALANCE.breakPerfectHeavy).toBeUndefined();
    expect(BALANCE.breakPerfectByRank).toEqual({});
  });

  for (const [name, f] of BIG) {
    it(`${name}の赤い大技: 完全成功だけ・弱点だけ・合計ダメージでは崩れない。弱点で完全成功なら崩れる。魔力の楔・閃光の破砕玉は崩せる`, () => {
      expect(perfectHit(f)).toEqual([]);
      expect(weakHit(f, false)).toEqual([]);
      expect(damage25(f)).toEqual([]);
      expect(weakHit(f, true)).toEqual(['weak']);
      expect(wedge(f)).toEqual(['perfect']);
      expect(flash(f)).toBe(true);
    });
  }

  for (const [name, f] of SMALL) {
    it(`${name}の赤い大技: 今までどおり、完全成功・弱点（完全成功でなくても）・合計ダメージのどれでも崩れる`, () => {
      expect(perfectHit(f)).toEqual(['perfect']);
      expect(weakHit(f, false)).toEqual(['weak']);
      expect(weakHit(f, true)).toEqual(['weak']);
      expect(damage25(f)).toEqual(['damage']);
      expect(wedge(f)).toEqual(['perfect']);
    });
  }

  it('紫の札の敵の行動は、behavior 付きの大技（テストの前提）', () => {
    const slime = ENEMIES.all.find((e) => e.id === PURPLE.defId)!;
    expect(slime.weak).toEqual(['thunder']);
    const act = slime.actions.find((a) => a.id === PURPLE.actionId)!;
    expect(act.big).toBe(true);
    expect(act.behavior).toBeTruthy();
  });

  for (const [name, f] of [...SMALL, ...BIG]) {
    it(`${name}の戦闘の紫の札: 完全成功だけ・弱点だけ・合計ダメージでは崩れない。弱点で完全成功なら崩れる。弱点看破・魔力の楔・閃光の破砕玉は崩せる`, () => {
      expect(perfectHit(f, PURPLE)).toEqual([]);
      expect(weakHit(f, false, PURPLE)).toEqual([]);
      expect(damage25(f, PURPLE)).toEqual([]);
      expect(weakHit(f, true, PURPLE)).toEqual(['weak']);
      // 弱点看破の印（弱点を突いた扱い）で、属性の無い一撃の完全成功でも崩れる
      expect(perfectHit(f, PURPLE, true)).toEqual(['weak']);
      expect(wedge(f, PURPLE)).toEqual(['perfect']);
      expect(flash(f, PURPLE)).toBe(true);
    });
  }

  it('同じ敵でも、赤い札（紫でない大技）を予告している時は、ふつうの戦闘なら今までどおり', () => {
    // 泥のスライムは紫の札のほかに大技を持たないので、門番ガルザの赤い札と、紫の札の門番（かばう等）を持つ敵で見る
    const both = ENEMIES.all.find((e) => e.weak?.length && e.actions.some((a) => a.big && !a.behavior) && e.actions.some((a) => a.big && a.behavior))!;
    expect(both).toBeDefined();
    const red = { defId: both.id, actionId: both.actions.find((a) => a.big && !a.behavior)!.id };
    const purple = { defId: both.id, actionId: both.actions.find((a) => a.big && a.behavior)!.id };
    expect(perfectHit({}, red)).toEqual(['perfect']);
    expect(perfectHit({}, purple)).toEqual([]);
    const r = gate(1, {}, red);
    const p = gate(1, {}, purple);
    expect(breakRuleOf(r, r.enemies[0])).toMatchObject({ weakAndPerfect: false, weakAlone: true });
    expect(breakRuleOf(r, r.enemies[0]).strictBy).toBeUndefined();
    expect(breakRuleOf(p, p.enemies[0])).toMatchObject({ weakAndPerfect: true, weakAlone: false, strictBy: 'behavior' });
    expect(breakRuleOf(p, p.enemies[0]).damagePct).toBeUndefined();
  });

  it('弱点を持たない敵の紫の札は、完全成功で崩れる（合計ダメージでは崩れない）', () => {
    // 今のデータには「弱点を持たず、紫の札を持つ敵」がいないので、泥のスライムの弱点を、このテストの間だけ外して確かめる
    const slime = ENEMIES.get(PURPLE.defId) as { weak?: string[] };
    const saved = slime.weak;
    slime.weak = [];
    try {
      expect(perfectHit({}, PURPLE)).toEqual(['perfect']);
      expect(damage25({}, PURPLE)).toEqual([]);
      const s = gate(1, {}, PURPLE);
      const rule = breakRuleOf(s, s.enemies[0]);
      expect(rule).toMatchObject({ weakAndPerfect: false, perfectAlone: true });
      expect(rule.damagePct).toBeUndefined();
      expect(breakHowText(s, s.enemies[0])).toBe('完全成功で攻撃した時に体勢を崩せる（大きなダメージでは崩れない）');
    } finally {
      slime.weak = saved;
    }
  });

  it('弱点を持たない大物は、完全成功で崩れる（合計ダメージでは崩れない）', () => {
    const noWeak = ENEMIES.all.find((e) => !e.weak?.length && e.actions.some((x) => x.big && !x.behavior))!;
    expect(noWeak).toBeDefined();
    const s = createBattle({ seed: 5, party: party('warrior', 'mage'), encounter: { id: 't', name: 't', enemies: [{ defId: noWeak.id, level: 10 }], boss: true } });
    s.enemies[0].hp = s.enemies[0].maxHp = 100000;
    s.enemies[0].intent = { actionId: noWeak.actions.find((x) => x.big && !x.behavior)!.id, targetId: 'a0' };
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    s.allies[0].focus = 3;
    expect(whys(applyCommand(s, play('a0', card.uid, 'e0', 3)).events)).toEqual(['perfect']);
    const rule = breakRuleOf(s, s.enemies[0]);
    expect(rule).toMatchObject({ weakAndPerfect: false, perfectAlone: true });
    expect(rule.damagePct).toBeUndefined();
    expect(breakHowText(s, s.enemies[0])).toBe('完全成功で攻撃した時に体勢を崩せる（大きなダメージでは崩れない）');
  });

  it('説明の文は決まりの関数から作る（大物・紫の札 = 弱点で完全成功の時だけ・赤い札 = どれか）', () => {
    const big = gate(1, { boss: true });
    expect(breakRuleOf(big, big.enemies[0])).toMatchObject({ weak: ['thunder'], weakAndPerfect: true, perfectAlone: false, weakAlone: false, strictBy: 'rank' });
    expect(breakHowText(big, big.enemies[0])).toBe('ボス・中ボス・災厄の大技は、弱点の属性（雷）で、しかも完全成功で攻撃した時だけ体勢を崩せる（完全成功だけ・大きなダメージでは崩れない）');
    expect(intentView(big, big.enemies[0])!.details[0]).toContain('弱点の属性（雷）で、しかも完全成功');
    const purple = gate(1, {}, PURPLE);
    expect(breakRuleOf(purple, purple.enemies[0])).toMatchObject({ weak: ['thunder'], weakAndPerfect: true, strictBy: 'behavior' });
    expect(breakHowText(purple, purple.enemies[0])).toBe('特殊な行動（紫の札）は、弱点の属性（雷）で、しかも完全成功で攻撃した時だけ体勢を崩せる（完全成功だけ・大きなダメージでは崩れない）');
    expect(intentView(purple, purple.enemies[0])!.details[0]).toContain('特殊な行動（紫の札）は、弱点の属性（雷）で、しかも完全成功');
    const small = gate(1, { elite: true });
    expect(breakRuleOf(small, small.enemies[0])).toMatchObject({ weakAndPerfect: false, perfectAlone: true, weakAlone: true, damagePct: BALANCE.breakDamagePct });
    expect(breakHowText(small, small.enemies[0])).toBe(`弱点の属性（雷）で攻撃・完全成功で攻撃・このターンに最大HPの${BALANCE.breakDamagePct}%のダメージ、のどれかで体勢を崩せる`);
  });
});
