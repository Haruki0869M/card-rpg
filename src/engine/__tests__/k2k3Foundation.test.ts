// K2/K3の土台: 新しい条件・効果・装備の探索効果・シナリオ限定装備・敵の亜種
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { AURA_IDS } from '../../data/enemyAuras';
import { makeVariant } from '../../data/enemyVariant';
import { createRng, createBattle, createGame } from '../index';
import { testConditions } from '../abilities';
import { applyEffect, dealDamage, makeCtx } from '../battle/effects';
import { getCard } from '../../data/cards';
import { visionOf } from '../game/world/fog';
import { rollEquipment } from '../game/loot';
import type { AbilityCondition, AbilityDef, EnemyDef } from '../../types';
import { setup } from './helpers';

const fresh = () => createBattle(setup(5, ['warrior', 'mage']));
const ctxOf = (s: ReturnType<typeof fresh>) => makeCtx(s, createRng(1), [], s.allies[0], { target: s.enemies[0], card: getCard('strike') });
const newGame = () => createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });

describe('K2 新しい条件', () => {
  const check = (s: ReturnType<typeof fresh>, conds: AbilityCondition[]) => testConditions(conds, { state: s, self: s.allies[0], card: getCard('strike') });

  it('selfStatus・selfHpAtLeast', () => {
    const s = fresh();
    expect(check(s, [{ kind: 'selfStatus', status: 'poison' }])).toBe(false);
    s.allies[0].statuses.poison = 3;
    expect(check(s, [{ kind: 'selfStatus', status: 'poison', min: 3 }])).toBe(true);
    expect(check(s, [{ kind: 'selfStatus', status: 'poison', min: 4 }])).toBe(false);
    expect(check(s, [{ kind: 'selfHpAtLeast', pct: 100 }])).toBe(true);
    s.allies[0].hp -= 1;
    expect(check(s, [{ kind: 'selfHpAtLeast', pct: 100 }])).toBe(false);
  });

  it('foeCount: 生きている敵の数', () => {
    const s = fresh();
    const n = s.enemies.length;
    expect(check(s, [{ kind: 'foeCount', min: n }])).toBe(true);
    expect(check(s, [{ kind: 'foeCount', max: 1 }])).toBe(n <= 1);
    s.enemies.slice(1).forEach((e) => (e.dead = true));
    expect(check(s, [{ kind: 'foeCount', max: 1 }])).toBe(true);
  });

  it('cardCost・cardSlots', () => {
    const s = fresh();
    const strike = getCard('strike');
    expect(check(s, [{ kind: 'cardCost', max: strike.cost }])).toBe(true);
    expect(check(s, [{ kind: 'cardCost', min: strike.cost + 1 }])).toBe(false);
    expect(check(s, [{ kind: 'cardSlots', min: strike.slots, max: strike.slots }])).toBe(true);
    expect(check(s, [{ kind: 'cardSlots', min: strike.slots + 1 }])).toBe(false);
  });

  it('hasPet', () => {
    const s = fresh();
    expect(check(s, [{ kind: 'hasPet' }])).toBe(false);
    s.allies[0].pet = { petId: 'x', color: 'y', name: 'z', love: 0 };
    expect(check(s, [{ kind: 'hasPet' }])).toBe(true);
  });
});

describe('K2 新しい効果', () => {
  it('blockFromStatus: 敵全員の毒の合計と同じ量のブロック（最大あり）', () => {
    const s = fresh();
    s.enemies[0].statuses.poison = 4;
    if (s.enemies[1]) s.enemies[1].statuses.poison = 3;
    const total = s.enemies.reduce((n, e) => n + (e.statuses.poison ?? 0), 0);
    const ctx = ctxOf(s);
    s.allies[0].block = 0;
    expect(applyEffect(ctx, { kind: 'blockFromStatus', status: 'poison' })).toBe(true);
    expect(s.allies[0].block).toBe(total);
    s.allies[0].block = 0;
    applyEffect(ctx, { kind: 'blockFromStatus', status: 'poison', max: 2 });
    expect(s.allies[0].block).toBe(2);
    for (const e of s.enemies) e.statuses.poison = 0;
    expect(applyEffect(ctx, { kind: 'blockFromStatus', status: 'poison' })).toBe(false);
  });

  it('convertStatus: 毒を火傷に変える（量はそのまま）', () => {
    const s = fresh();
    s.enemies[0].statuses.poison = 5;
    s.enemies[0].statuses.burn = 1;
    expect(applyEffect(ctxOf(s), { kind: 'convertStatus', status: 'poison', into: 'burn' })).toBe(true);
    expect(s.enemies[0].statuses.poison).toBe(0);
    expect(s.enemies[0].statuses.burn).toBe(6);
    expect(applyEffect(ctxOf(s), { kind: 'convertStatus', status: 'poison', into: 'burn' })).toBe(false);
  });
});

describe('K2 新しい常時型の能力', () => {
  const guard = (mode: 'immune' | 'absorb' | 'half'): AbilityDef => ({ name: '炎除け', effect: { modifier: 'elementGuard', element: 'fire', mode } });
  const fireHit = (mode: 'immune' | 'absorb' | 'half' | null) => {
    const s = fresh();
    const ally = s.allies[0];
    ally.hp = Math.floor(ally.maxHp / 2);
    const before = ally.hp;
    if (mode) ally.abilities = [guard(mode)];
    const loss = dealDamage(makeCtx(s, createRng(1), [], s.enemies[0], { target: ally }), ally, 20, 'fire');
    return { loss, hp: ally.hp, before };
  };

  it('elementGuard: 無効・吸収・半減', () => {
    const none = fireHit(null);
    expect(none.loss).toBeGreaterThan(0);
    expect(fireHit('immune').loss).toBe(0);
    expect(fireHit('half').loss).toBe(Math.floor(none.loss / 2));
    const absorb = fireHit('absorb');
    expect(absorb.loss).toBe(0);
    expect(absorb.hp).toBeGreaterThan(absorb.before);
  });

  it('elementGuard: 別の属性には働かない', () => {
    const s = fresh();
    const ally = s.allies[0];
    ally.abilities = [guard('immune')];
    expect(dealDamage(makeCtx(s, createRng(1), [], s.enemies[0], { target: ally }), ally, 10, 'ice')).toBeGreaterThan(0);
  });

  it('convertElement: 属性の無い物理攻撃が炎になる（完全成功で火傷）。魔法は変わらない', () => {
    const s = fresh();
    const w = s.allies[0];
    w.abilities = [{ name: '炎の付与', effect: { modifier: 'convertElement', into: 'fire' } }];
    const victim = s.enemies[0];
    victim.statuses.burn = 0;
    dealDamage(makeCtx(s, createRng(1), [], w, { target: victim, card: getCard('strike'), perfect: true }), victim, 5);
    expect(victim.statuses.burn).toBeGreaterThan(0);
    const v2 = s.enemies[1] ?? victim;
    v2.statuses.burn = 0;
    dealDamage(makeCtx(s, createRng(1), [], w, { target: v2, card: getCard('magicArrow'), perfect: true }), v2, 1);
    expect(v2.statuses.burn ?? 0).toBe(0);
  });
});

describe('K2 装備のデータ', () => {
  it('探索効果: 視界が足される', () => {
    const game = newGame();
    const h = game.heroes[0];
    const base = visionOf(game, game.world!, h.id);
    h.equipment.accessory = { uid: 'x1', itemId: 'farsightAmulet' };
    expect(visionOf(game, game.world!, h.id)).toBe(base + 1);
  });

  it('シナリオ限定の装備は、そのシナリオの冒険でだけ出る', () => {
    const game = newGame();
    const rng = createRng(9);
    const seen = (scenario: string) => new Set(Array.from({ length: 300 }, () => rollEquipment('rare', game.heroes, rng, { scenario, slot: 'accessory' }).id));
    expect(seen('corruptionKing').has('erosionRing')).toBe(true);
    expect(seen('frozenKingdom').has('erosionRing')).toBe(false);
    for (const id of seen('corruptionKing')) expect(ITEMS.get(id).slot).toBe('accessory');
  });

  it('レア以上の鎧は、固有の効果（特殊能力か探索効果）を持つ（K2以前の2つは例外）', () => {
    const legacy = new Set(['ironArmor', 'magicRobe']);
    for (const i of ITEMS.all.filter((x) => x.slot === 'armor' && x.rarity !== 'common' && !legacy.has(x.id))) expect(i.ability ?? i.explore, i.id).toBeDefined();
  });

  it('コモン以外の装備は、中身が空でない', () => {
    for (const i of ITEMS.all.filter((x) => x.slot !== 'consumable' && x.rarity !== 'common')) {
      const has = i.stats || i.maxHp || i.focusMax || i.startBlock || i.extraDraw || i.ability || i.explore || i.cards;
      expect(has, i.id).toBeTruthy();
    }
  });
});

describe('K3 敵の亜種', () => {
  it('makeVariant: 元の敵を土台に、IDと名前とオーラを変える', () => {
    const base = ENEMIES.get('forestWolf');
    const v = makeVariant(base, { id: 'forestWolfTest', name: '炎の狼', aura: 'ember', weak: ['ice'], resist: ['fire'] });
    expect(v.variantOf).toBe('forestWolf');
    expect(v.maxHp).toBe(base.maxHp);
    expect(v.actions).toEqual(base.actions);
    expect(v.id).toBe('forestWolfTest');
    expect(makeVariant(v, { id: 'forestWolfTest2', name: '二度目', aura: 'frost' }).variantOf).toBe('forestWolf');
  });

  const json = (a: unknown) => JSON.stringify(a ?? null);
  const elementsOf = (e: EnemyDef) => e.actions.map((a) => a.effects.map((x) => ('element' in x ? x.element : null)));
  const differs = (v: EnemyDef, base: EnemyDef) =>
    json(v.weak) !== json(base.weak) || json(v.resist) !== json(base.resist) || json(v.abilities) !== json(base.abilities) || json(elementsOf(v)) !== json(elementsOf(base));

  it('亜種は全体の2割以下で、元の敵が実在し、属性か開幕の特性が違い、オーラが付く', () => {
    const variants = ENEMIES.all.filter((e) => e.variantOf);
    expect(variants.length).toBeLessThanOrEqual(Math.floor(ENEMIES.all.length * 0.2));
    for (const v of variants) {
      const base = ENEMIES.tryGet(v.variantOf!);
      expect(base, `${v.id}: 元の敵 ${v.variantOf}`).toBeDefined();
      expect(base!.variantOf, `${v.id}: 亜種の亜種にしない`).toBeUndefined();
      expect(AURA_IDS, `${v.id}: オーラ`).toContain(v.aura);
      expect(differs(v, base!), `${v.id}: 属性か開幕の特性を変える`).toBe(true);
    }
  });

  it('オーラは亜種にだけ付く', () => {
    for (const e of ENEMIES.all) if (e.aura) expect(e.variantOf, e.id).toBeDefined();
  });
});
