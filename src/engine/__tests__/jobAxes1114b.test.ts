// 2026-11-14（docs/tasks/job-axes-plan2.md・オーナーの返事 1A・2A・3A）: 機工士「装甲砲台」・調教師「かこめ！」
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ENEMIES } from '../../data/enemies';
import type { AllyState, BattleState, Command, Hero, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, toPartyMember } from '../index';
import { applyEffect, describeEffect, makeCtx } from '../battle/effects';
import { createRng } from '../rng';
import { heroCardPool } from '../game/jobs';

const P: PlayerId = 'P1';
const wait = [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block' as const, amount: 0 }] }];
const dummy = { icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence' };
ENEMIES.register({ ...dummy, id: 'axes1114bIdler', name: '確認用の置物', maxHp: 100000, actions: wait });
ENEMIES.register({ ...dummy, id: 'axes1114bSmall', name: '確認用の小さい置物', maxHp: 3, actions: wait });

function battle(classes: string[], enemies = ['axes1114bIdler']): BattleState {
  const g = createGame({ seed: 23, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: P })) });
  const s = createBattle({ seed: 23, party: g.heroes.map(toPartyMember), encounter: { id: 'axes1114b', name: '確認', enemies: enemies.map((defId) => ({ defId })) } });
  for (const a of s.allies) { a.mana = 30; a.focus = 9; a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
let uid = 0;
/** カードを使う。successes = 成功させる枠の数（その数だけフォーカスを使い、失敗を成功に直す） */
function use(s: BattleState, cardId: string, successes: number, target = 0) {
  const a = s.allies[0], inst = { uid: `b${uid++}`, cardId };
  a.hand.push(inst);
  a.fixMiss = 9;
  const card = getCard(cardId);
  const r = applyCommand(s, { type: 'PLAY_CARD', playerId: P, characterId: a.id, cardInstanceId: inst.uid, targetId: card.target === 'enemy' ? s.enemies[target].uid : undefined, focusUsed: successes } as Command);
  expect(r.error, cardId).toBeUndefined();
  return r;
}
function endTurn(s: BattleState) {
  let st = applyCommand(s, { type: 'END_TURN', playerId: P }).state;
  for (let i = 0; st.phase === 'enemy' && i < 20; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}
const lost = (before: BattleState, after: BattleState, i = 0) => before.enemies[i].hp - after.enemies[i].hp;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const poolOf = (classId: string) => heroCardPool({ classId, jobs: [], deck: [], equipment: {} } as unknown as Hero, false);

describe('機工士「装甲砲台」（重装の撃つ側）', () => {
  it('ブロック 4/6/8 を得て、砲台を置き直す（2台にならない）', () => {
    // 成功の数ごとの中身（データ）: ブロック 4/6/8 ＋ 同じ砲台（40%・最大+10）
    const tiers = getCard('axArmoredTurret').tiers;
    expect(tiers.map((t) => t.effects.find((e) => e.kind === 'block'))).toEqual([4, 6, 8].map((amount) => ({ kind: 'block', amount })));
    for (const t of tiers) expect(t.effects.find((e) => e.kind === 'summon')).toMatchObject({ id: 'turret', replace: true, blockPct: 40, blockMax: 10 });
    // 遊んだ時（完全成功）
    const s = battle(['machinist']);
    expect(s.allies[0].summons?.filter((x) => x.id === 'turret')).toHaveLength(1); // 自動砲台
    const r = use(s, 'axArmoredTurret', 2);
    const turrets = r.state.allies[0].summons!.filter((x) => x.id === 'turret');
    expect(turrets).toHaveLength(1);
    expect(turrets[0].blockPct).toBe(40);
    expect(turrets[0].turns).toBe(3);
    expect(r.state.allies[0].block).toBe(8);
  });
  it('砲台は撃つたびに、今のブロックの40%を足す（ブロックは減らない）', () => {
    const r = use(battle(['machinist']), 'axArmoredTurret', 2); // ブロック8
    r.state.allies[0].block = 20; // 20 × 40% = +8
    const plain = battle(['machinist']);
    plain.allies[0].block = 20;
    const before = clone(r.state);
    // ターンの終わりの1発: 3 + 8 = 11（ふつうの砲台は3）
    const after = applyCommand(r.state, { type: 'END_TURN', playerId: P }).state;
    const plainAfter = applyCommand(clone(plain), { type: 'END_TURN', playerId: P }).state;
    expect(lost(before, after)).toBe(11);
    expect(lost(plain, plainAfter)).toBe(3);
    expect(after.allies[0].block).toBe(20);
  });
  it('足し算は最大+10（ブロック25でも 3 + 10 = 13）', () => {
    const r = use(battle(['machinist']), 'axArmoredTurret', 0);
    r.state.allies[0].block = 25;
    const before = clone(r.state);
    expect(lost(before, applyCommand(r.state, { type: 'END_TURN', playerId: P }).state)).toBe(13);
  });
  it('二連射（砲台が今すぐ1回撃つ）でも足す', () => {
    const r = use(battle(['machinist']), 'axArmoredTurret', 0);
    r.state.allies[0].block = 10; // +4
    const plain = battle(['machinist']);
    plain.allies[0].block = 10;
    const a = lost(r.state, use(clone(r.state), 'machineVolley', 0).state);
    const b = lost(plain, use(clone(plain), 'machineVolley', 0).state);
    expect(a - b).toBe(4);
  });
  it('ふつうの「砲台設置」で置き直すと、ブロックの上乗せは消える', () => {
    const r = use(battle(['machinist']), 'axArmoredTurret', 0);
    const r2 = use(r.state, 'placeTurret', 0);
    const t = r2.state.allies[0].summons!.filter((x) => x.id === 'turret');
    expect(t).toHaveLength(1);
    expect(t[0].blockPct).toBeUndefined();
  });
  it('保存して再開しても（JSON を挟んでも）同じ結果。同じ操作なら同じ結果（オンラインでも同じ）', () => {
    const r = use(battle(['machinist']), 'axArmoredTurret', 2);
    const saved = clone(r.state);
    expect(JSON.stringify(endTurn(clone(saved)))).toBe(JSON.stringify(endTurn(r.state)));
  });
  it('置き場は機工士だけ', () => {
    for (const j of CLASSES.all) expect(poolOf(j.id).includes('axArmoredTurret'), j.id).toBe(j.id === 'machinist');
  });
});

describe('調教師「かこめ！」（状態異常の受け皿）', () => {
  /** お供の能力（カードの対象の敵へ2ダメージ）。数えやすいように「ターン終了時」にしておく */
  const trainer = (enemies?: string[]) => {
    const s = battle(['petTrainer'], enemies);
    const a = s.allies[0] as AllyState;
    a.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴーちゃん', love: 0, acts: 0 } as never;
    a.abilities = [...(a.abilities ?? []), { name: 'とびかかり', pet: true, effect: { when: 'turnEnd', do: [{ kind: 'damage', amount: 2 }] } }];
    return s;
  };
  const pounces = (s: BattleState) => s.log.filter((l) => l.text.includes('「とびかかり」')).length;

  it('悪い状態異常1種類につき1回、お供が行動する（最大 2/2/3回）。状態異常は消えない', () => {
    expect(getCard('axSurround').tiers.map((t) => t.effects.find((e) => e.kind === 'petPounce'))).toEqual([2, 2, 3].map((max) => ({ kind: 'petPounce', max })));
    expect(getCard('axSurround').tiers.map((t) => t.effects.find((e) => e.kind === 'damage'))).toEqual([3, 5, 7].map((amount) => ({ kind: 'damage', amount })));
    const s = trainer();
    Object.assign(s.enemies[0].statuses, { weak: 2, vulnerable: 1, poison: 3, curse: 1 });
    // 完全成功 = 最大3回（4種類あっても3回まで）
    const r = use(clone(s), 'axSurround', 2);
    expect(pounces(r.state)).toBe(3);
    expect(r.state.enemies[0].statuses).toMatchObject({ weak: 2, vulnerable: 1, poison: 3, curse: 1 });
    // 最大2回の段（効果をそのまま当てる）
    const s2 = clone(s);
    const ctx = makeCtx(s2, createRng(1), [], s2.allies[0], { target: s2.enemies[0] });
    expect(applyEffect(ctx, { kind: 'petPounce', max: 2 })).toBe(true);
    expect(pounces(s2)).toBe(2);
  });
  it('状態異常が1種類なら1回・無ければダメージだけ', () => {
    const one = trainer();
    one.enemies[0].statuses.weak = 1;
    expect(pounces(use(one, 'axSurround', 2).state)).toBe(1);
    const none = trainer();
    const r = use(none, 'axSurround', 2);
    expect(pounces(r.state)).toBe(0);
    expect(lost(none, r.state)).toBeGreaterThanOrEqual(7);
  });
  it('お供は、カードで選んだ敵を狙う（先頭の敵ではない）', () => {
    const s = trainer(['axes1114bIdler', 'axes1114bIdler']);
    Object.assign(s.enemies[1].statuses, { weak: 1, vulnerable: 1 });
    const r = use(s, 'axSurround', 0, 1);
    expect(lost(s, r.state, 0)).toBe(0);
    expect(lost(s, r.state, 1)).toBeGreaterThanOrEqual(3 + 2 * 2);
  });
  it('お供の行動の「1ターン4回まで」に数える（もう3回動いていたら、1回だけ）', () => {
    const s = trainer();
    Object.assign(s.enemies[0].statuses, { weak: 1, vulnerable: 1, poison: 1 });
    (s.allies[0].counters ??= {}).petActsTurn = 3;
    const r = use(s, 'axSurround', 2);
    expect(pounces(r.state)).toBe(1);
    expect(r.state.allies[0].counters!.petActsTurn).toBe(4);
  });
  it('お供がいなければ、ダメージだけ（止まらない）', () => {
    const s = battle(['petTrainer']);
    s.enemies[0].statuses.weak = 1;
    const r = use(s, 'axSurround', 1);
    expect(lost(s, r.state)).toBeGreaterThanOrEqual(5);
  });
  it('対象が倒れたら、お供は動かない', () => {
    const s = trainer(['axes1114bSmall']);
    s.enemies[0].statuses.weak = 1;
    const r = use(s, 'axSurround', 2);
    expect(r.state.enemies[0].dead).toBe(true);
    expect(pounces(r.state)).toBe(0);
  });
  it('保存して再開しても（JSON を挟んでも）同じ結果。同じ操作なら同じ結果（オンラインでも同じ）', () => {
    const s = trainer();
    Object.assign(s.enemies[0].statuses, { weak: 1, vulnerable: 1, poison: 1 });
    const a = use(clone(s), 'axSurround', 2).state;
    const b = use(JSON.parse(JSON.stringify(s)), 'axSurround', 2).state;
    // uid の通し番号だけ違うので、手札・捨て札の uid は比べない
    const strip = (x: BattleState) => JSON.stringify({ ...x, allies: x.allies.map((al) => ({ ...al, hand: [], discard: al.discard.length, drawPile: al.drawPile.length })) });
    expect(strip(b)).toBe(strip(a));
  });
  it('置き場は調教師だけ', () => {
    for (const j of CLASSES.all) expect(poolOf(j.id).includes('axSurround'), j.id).toBe(j.id === 'petTrainer');
  });
});

const describeCard = (id: string) => { const c = getCard(id); return c.tiers.flatMap((t) => t.effects.map((e) => describeEffect(e, 'ally', c))).join(' / '); };
describe('説明の文', () => {
  it('2枚とも、効果の説明に抜けが無い', () => {
    const t = describeCard('axArmoredTurret');
    expect(t).toContain('40%');
    expect(t).toContain('最大+10');
    const k = describeCard('axSurround');
    expect(k).toContain('悪い状態異常1種類につき');
    expect(k).toContain('消えない');
    expect(t + k).not.toMatch(/undefined|NaN|\[object/);
  });
});
