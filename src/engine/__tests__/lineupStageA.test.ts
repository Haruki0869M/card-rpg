// ラインナップの作り直し 区切りA（docs/tasks/lineup-impl-plan.md）
// 鎧 83→29・装飾品 149→52、新しい仕組み（状態異常を防ぐ・召喚の残りターン・お供の行動・弱点の上限・探索の力）、保存の版 v18。
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { getCard } from '../../data/cards';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, getItem } from '../../data/items';
import type { BattleEvent, BattleState, GameState, PlayerId } from '../../types';
import { createBattle, createGame, createRng, describeAbility, mapKnowledge, migrateGame, partyMapReveal, statChance, toPartyMember, dungeonGrid, activeCells, cellKey, exploredPercent, buildDungeon } from '../index';
import { STATE_VERSION } from '../battle/battle';
import { damageModifiers, fireAbilities } from '../abilities';
import { applyEffect, makeCtx } from '../battle/effects';

ENEMIES.register({ id: 'stageAIdler', name: '確認用の置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });
ENEMIES.register({ id: 'stageAWeakFire', name: '確認用の火に弱い置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence', weak: ['fire'],
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });

type Gear = { armor?: string; accessory?: string; pet?: string };

function game(classes: string[], gear: Gear[], seed = 11): GameState {
  const g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: `P${i + 1}` as PlayerId })) });
  g.heroes.forEach((h, i) => {
    const x = gear[i] ?? {};
    if (x.armor) h.equipment.armor = { uid: `x${i}a`, itemId: x.armor };
    if (x.accessory) h.equipment.accessory = { uid: `x${i}c`, itemId: x.accessory };
    if (x.pet) h.pet = { petId: x.pet, color: 'default', name: 'ぴよ', love: 0, acts: 0 };
  });
  return g;
}
function battle(classes: string[], gear: Gear[], enemy = 'stageAIdler'): BattleState {
  const g = game(classes, gear);
  return createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'stageA', name: '確認', enemies: [{ defId: enemy }] } });
}
const st = (u: { statuses: Record<string, number | undefined> }, id: string) => u.statuses[id] ?? 0;
/** 敵1体目が、index 番目の味方に状態異常を付けようとする */
function inflict(s: BattleState, index: number, status: string, amount = 1) {
  const events: BattleEvent[] = [];
  // 敵の行動は、インテントの相手を狙う
  s.enemies[0].intent = { ...s.enemies[0].intent!, targetId: s.allies[index].id };
  const ctx = makeCtx(s, createRng(1), events, s.enemies[0], { target: s.allies[index] });
  applyEffect(ctx, { kind: 'applyStatus', status, amount, to: 'target' });
  return events;
}

describe('区切りA: 数', () => {
  it('鎧は29着・装飾品は52個', () => {
    expect(ITEMS.all.filter((i) => i.slot === 'armor')).toHaveLength(29);
    expect(ITEMS.all.filter((i) => i.slot === 'accessory')).toHaveLength(52);
  });
  it('外した物は無い。属性除けは6属性そろい、どのシナリオでも出る', () => {
    for (const id of ['mithrilMail', 'petTrustCharm', 'rampartPendant', 'burnRecoveryPendant', 'pearlNecklace']) expect(ITEMS.tryGet(id), id).toBeUndefined();
    const coats = ['insulatedCoat', 'whiteWolfFur', 'sailorCoat', 'nightgown', 'desertCloak', 'cloudCloak'].map(getItem);
    expect(coats.map((c) => { const e = c.ability!.effect; return 'modifier' in e && e.modifier === 'elementGuard' ? e.element : ''; }).sort())
      .toEqual(['dark', 'fire', 'holy', 'ice', 'poison', 'thunder']);
    for (const c of coats) {
      expect(c.scenario, c.id).toBeUndefined();
      expect([c.rarity, c.maxHp, c.startBlock], c.id).toEqual(['rare', 8, 3]);
    }
    for (const id of ['emberRing', 'stormRing', 'nightmareRing', 'crystalNecklace', 'meteorRing', 'sparkRing', 'coolantFlask']) expect(getItem(id).scenario, id).toBeUndefined();
  });
});

describe('区切りA: 状態異常を防ぐ', () => {
  it('春待ちの外套: 凍結にならず、代わりにブロック6。ほかの状態異常は受ける。何回でも', () => {
    const s = battle(['warrior'], [{ armor: 'springWaitCloak' }]);
    const a = s.allies[0];
    const before = a.block;
    const ev = inflict(s, 0, 'freeze');
    expect(st(a, 'freeze')).toBe(0);
    expect(a.block).toBe(before + 6);
    expect(ev.some((e) => e.type === 'ability' && e.name === '春を待つ')).toBe(true);
    expect(ev.some((e) => e.type === 'status')).toBe(false);
    inflict(s, 0, 'freeze');
    expect(st(a, 'freeze')).toBe(0);
    expect(a.block).toBe(before + 12);
    inflict(s, 0, 'weak');
    expect(st(a, 'weak')).toBe(1);
  });
  it('灯火のランタン: 味方の1人ずつ、戦闘で最初の悪い状態異常を1回だけ防ぐ（持ち主でない仲間も）', () => {
    const s = battle(['warrior', 'mage'], [{ accessory: 'lampLantern' }, {}]);
    for (const i of [0, 1]) {
      inflict(s, i, 'weak');
      expect(st(s.allies[i], 'weak'), `1回目 ${i}`).toBe(0);
      inflict(s, i, 'burn', 2);
      expect(st(s.allies[i], 'burn'), `2回目 ${i}`).toBe(2);
    }
  });
  it('灯火のランタン: 持ち主が倒れていたら守らない。味方が掛ける良い状態は防がない', () => {
    const s = battle(['warrior', 'mage'], [{ accessory: 'lampLantern' }, {}]);
    const ev: BattleEvent[] = [];
    applyEffect(makeCtx(s, createRng(1), ev, s.allies[0], { target: s.enemies[0] }), { kind: 'applyStatus', status: 'regen', amount: 2, to: 'self' });
    expect(st(s.allies[0], 'regen')).toBe(2);
    s.allies[0].dead = true;
    inflict(s, 1, 'weak');
    expect(st(s.allies[1], 'weak')).toBe(1);
  });
  it('属性の攻撃に付いてくる状態異常も防ぐ（春待ちの外套と氷の攻撃）', () => {
    const s = battle(['warrior'], [{ armor: 'springWaitCloak' }]);
    s.enemies[0].intent = { ...s.enemies[0].intent!, targetId: s.allies[0].id };
    for (let seed = 1; seed <= 40; seed++) {
      const ctx = makeCtx(s, createRng(seed), [], s.enemies[0], { target: s.allies[0] });
      applyEffect(ctx, { kind: 'damage', amount: 1, element: 'ice', to: 'target' });
    }
    expect(st(s.allies[0], 'freeze')).toBe(0);
    // 比べる相手: 外套が無ければ、同じ攻撃で凍る
    const bare = battle(['warrior'], [{}]);
    bare.enemies[0].intent = { ...bare.enemies[0].intent!, targetId: bare.allies[0].id };
    for (let seed = 1; seed <= 40; seed++) applyEffect(makeCtx(bare, createRng(seed), [], bare.enemies[0], { target: bare.allies[0] }), { kind: 'damage', amount: 1, element: 'ice', to: 'target' });
    expect(st(bare.allies[0], 'freeze')).toBeGreaterThan(0);
  });
});

describe('区切りA: 召喚の残りターン', () => {
  it('技師のゴーグル: 召喚の残りターン+1。戦闘の間ずっといる物は変わらない', () => {
    for (const [acc, turns] of [[undefined, 3], ['engineerGoggles', 4]] as const) {
      const s = battle(['warrior'], [{ accessory: acc }]);
      const a = s.allies[0];
      const ctx = makeCtx(s, createRng(1), [], a, { target: s.enemies[0] });
      applyEffect(ctx, { kind: 'summon', id: 'testTurret', name: '砲台', icon: 'T', damage: 2, turns: 3 });
      applyEffect(ctx, { kind: 'summon', id: 'testForever', name: '番兵', icon: 'T', damage: 2, turns: 99 });
      expect(a.summons!.find((x) => x.id === 'testTurret')!.turns).toBe(turns);
      expect(a.summons!.find((x) => x.id === 'testForever')!.turns).toBe(99);
    }
  });
});

describe('区切りA: お供の行動', () => {
  it('相棒の鈴: お供が行動するたびブロック2。1ターンに2回まで', () => {
    const plain = battle(['warrior'], [{ pet: 'turtle' }]);
    const s = battle(['warrior'], [{ pet: 'turtle', accessory: 'partnerBell' }]);
    // 亀は戦闘開始時にブロック3（お供の行動 1回）→ 鈴でブロック2
    expect(s.allies[0].block).toBe(plain.allies[0].block + 2);
    const before = s.allies[0].block;
    for (let i = 0; i < 3; i++) fireAbilities(s, createRng(1), [], s.allies[0], 'petAct');
    expect(s.allies[0].block).toBe(before + 2);
  });
  it('相棒の鈴: お供がいなければ何も起きない', () => {
    const plain = battle(['warrior'], [{}]);
    const s = battle(['warrior'], [{ accessory: 'partnerBell' }]);
    expect(s.allies[0].block).toBe(plain.allies[0].block);
  });
  it('夢の捕まえ網: 戦闘開始時、お供が1回行動する（亀 = ターン終了時のブロック3を先に）', () => {
    const plain = battle(['warrior'], [{ pet: 'turtle' }]);
    const s = battle(['warrior'], [{ pet: 'turtle', accessory: 'dreamCatcher' }]);
    expect(s.allies[0].block).toBe(plain.allies[0].block + 3);
    expect((s.allies[0].counters?.petActs ?? 0) - (plain.allies[0].counters?.petActs ?? 0)).toBe(1);
  });
  it('夢の捕まえ網: 黒猫は先頭の敵に呪い。お供がいなければ何も起きない', () => {
    expect(st(battle(['warrior'], [{ pet: 'blackCat' }]).enemies[0], 'curse')).toBe(0);
    expect(st(battle(['warrior'], [{ pet: 'blackCat', accessory: 'dreamCatcher' }]).enemies[0], 'curse')).toBeGreaterThan(0);
    const s = battle(['warrior'], [{ accessory: 'dreamCatcher' }]);
    expect(s.allies[0].counters?.petActs ?? 0).toBe(0);
  });
  it('夢の捕まえ網: お供を連れている時だけ、イベントの判定+20%', () => {
    const withPet = game(['warrior'], [{ pet: 'turtle', accessory: 'dreamCatcher' }]).heroes[0];
    const bare = game(['warrior'], [{ pet: 'turtle' }]).heroes[0];
    expect(statChance(withPet, 'per', undefined, true) - statChance(bare, 'per', undefined, true)).toBe(20);
    expect(statChance(withPet, 'per') - statChance(bare, 'per')).toBe(0);
    const noPet = game(['warrior'], [{ accessory: 'dreamCatcher' }]).heroes[0];
    expect(statChance(noPet, 'per', undefined, true)).toBe(statChance(game(['warrior'], [{}]).heroes[0], 'per', undefined, true));
  });
});

describe('区切りA: 弱点の倍率', () => {
  const mul = (classId: string, acc?: string, enemy = 'stageAWeakFire') => {
    const s = battle([classId], [{ accessory: acc }], enemy);
    return damageModifiers(s, s.allies[0], getCard('fireball'), s.enemies[0], undefined, true, 'fire').multiplier / damageModifiers(s, s.allies[0], getCard('fireball'), s.enemies[0], undefined, true, 'thunder').multiplier;
  };
  it('元素のプリズム: 弱点 ×1.5 → ×1.75', () => {
    expect(mul('mage') * BALANCE.elementWeakMul).toBeCloseTo(1.5);
    expect(mul('mage', 'elementPrism') * BALANCE.elementWeakMul).toBeCloseTo(1.75);
  });
  it('大賢者《万象》と合わせても ×2.0 まで。弱点でない敵には何も起きない', () => {
    expect(mul('greatSage') * BALANCE.elementWeakMul).toBeCloseTo(1.95);
    expect(mul('greatSage', 'elementPrism') * BALANCE.elementWeakMul).toBeCloseTo(2.0);
    expect(mul('mage', 'elementPrism', 'stageAIdler')).toBeCloseTo(1);
  });
  it('説明文に上限が出る', () => {
    expect(describeAbility(getItem('elementPrism').ability!)).toContain('×2');
  });
});

describe('区切りA: 地図に最初から出る物', () => {
  const run = () => ({ ...buildDungeon('emeraldTemple', createRng(5), 1, []), seen: [] as string[] });
  it('何も無ければ、見たマスだけ', () => {
    const r = run();
    const k = mapKnowledge(r as never);
    expect(k.seen.size).toBe(0);
    expect(k.typed.size).toBe(0);
  });
  it('古い星図: 通路と扉のマスが全部出る。種類は出ない。探索度は変わらない', () => {
    const r = run();
    const k = mapKnowledge(r as never, { layout: true });
    expect([...k.seen].sort()).toEqual([...activeCells(r as never)].sort());
    expect(k.typed.size).toBe(0);
    expect(exploredPercent(r as never)).toBe(0);
    expect(r.seen).toEqual([]);
  });
  it('古い羅針盤: 休憩部屋のマスだけ出て、種類も分かる', () => {
    const r = run();
    const rests = r.rooms.filter((x) => x.type === 'rest').map((x) => x.id);
    expect(rests.length).toBeGreaterThan(0);
    const k = mapKnowledge(r as never, { rest: true });
    const act = activeCells(r as never);
    const cells = dungeonGrid(r as never).cells.filter((c) => c.roomId && rests.includes(c.roomId) && act.has(cellKey(c.x, c.y)));
    expect([...k.seen].sort()).toEqual(cells.map((c) => cellKey(c.x, c.y)).sort());
    expect([...k.typed].sort()).toEqual([...new Set(cells.map((c) => c.roomId!))].sort());
  });
  it('生きている仲間の装備だけを見る', () => {
    const g = game(['warrior', 'mage'], [{ accessory: 'oldCompass' }, { accessory: 'oldStarChart' }]);
    expect(partyMapReveal(g)).toEqual({ rest: true, layout: true });
    g.heroes[1].hp = 0;
    expect(partyMapReveal(g)).toEqual({ rest: true, layout: false });
  });
});

describe('区切りA: 保存の版', () => {
  it('今の保存データは読める（今の版は区切りBで v19。lineupStageB.test.ts）', () => {
    expect(STATE_VERSION).toBeGreaterThanOrEqual(18);
    const g = game(['warrior'], [{ accessory: 'partnerBell' }]);
    expect(migrateGame(structuredClone(g))).toEqual(g);
  });
  it('v17 の保存データは読まない（壊れずに null）', () => {
    const g = game(['warrior'], [{}]) as GameState & { version: number };
    g.version = 17;
    expect(migrateGame(structuredClone(g))).toBeNull();
    g.version = 16;
    expect(migrateGame(structuredClone(g))).toBeNull();
  });
});
