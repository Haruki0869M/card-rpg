// K1 スキルカード: 武器種カード・系統カード・異端カードの候補と決まり
import { describe, expect, it } from 'vitest';
import { CARDS, cardLineages, cardWeaponTypes } from '../../data/cards';
import { CLASSES, getClass } from '../../data/classes';
import { createGame, heroCardPool } from '../index';
import { jobWeapons } from '../game/hero';
import { pickCard, poolWeight } from '../game/cardTags';
import { createRng } from '../index';

const newGame = (classes: string[]) =>
  createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: 'P1' })) });

describe('K1 武器種・系統・異端のカード', () => {
  it('武器種カードは、その武器を装備できるジョブの候補に入る', () => {
    const [sword, mage] = newGame(['warrior', 'mage']).heroes;
    expect(heroCardPool(sword)).toContain('wtSwordLunge');
    expect(heroCardPool(mage)).not.toContain('wtSwordLunge');
  });

  it('系統カードは、同じ系統のジョブの候補に入る', () => {
    const [warrior, priest] = newGame(['warrior', 'priest']).heroes;
    expect(heroCardPool(warrior)).toContain('lnBuStack');
    expect(heroCardPool(priest)).not.toContain('lnBuStack');
  });

  it('異端カードは、どのジョブの候補にも入らない', () => {
    const heresy = CARDS.all.filter((c) => c.heresy);
    expect(heresy.length).toBeGreaterThan(0);
    for (const cls of CLASSES.all) {
      const hero = newGame([cls.id]).heroes[0];
      for (const c of heresy) expect(heroCardPool(hero), `${cls.id}: ${c.id}`).not.toContain(c.id);
    }
  });

  it('武器種・系統・異端のカードは、印が正しく付いている', () => {
    const weapons = new Set(CLASSES.all.flatMap((c) => jobWeapons(c.id)));
    for (const c of CARDS.all) {
      if (c.weaponType) expect(weapons.has(c.weaponType), `${c.id}: 武器種 ${c.weaponType}`).toBe(true);
      if (c.lineage) expect(['bu', 'ma', 'sei', 'gi']).toContain(c.lineage);
      if (c.heresy) expect(c.weaponType ?? c.lineage ?? c.common, `${c.id}: 異端に武器種・系統・共通は付けない`).toBeUndefined();
      if (c.weaponType || c.lineage || c.heresy || c.common) {
        // エピック以上は特殊能力が必須
        if (['epic', 'legend'].includes(c.rarity ?? 'common')) expect(c.trait, c.id).toBeDefined();
        expect(c.tiers[0].minSuccesses, c.id).toBe(0);
      }
    }
  });

  it('4系統とも15枚ずつ（コモン6・レア5・エピック4）', () => {
    for (const lineage of ['bu', 'ma', 'sei', 'gi']) {
      // 区切りD: 1枚を複数の系統に置けるので、置き場所で数える
      const cards = CARDS.all.filter((c) => cardLineages(c).includes(lineage));
      expect(cards, lineage).toHaveLength(15);
      const n = (r: string) => cards.filter((c) => (c.rarity ?? 'common') === r).length;
      expect([n('common'), n('rare'), n('epic')], lineage).toEqual([6, 5, 4]);
    }
  });

  it('全15の武器種が7枚ずつ（コモン3・レア2・エピック2）', () => {
    for (const type of ['sword', 'staff', 'tome', 'hammer', 'bow', 'dagger', 'spear', 'axe', 'fist', 'scepter', 'scythe', 'katana', 'whip', 'gun', 'instrument']) {
      const cards = CARDS.all.filter((c) => cardWeaponTypes(c).includes(type));
      expect(cards, type).toHaveLength(7);
      const n = (r: string) => cards.filter((c) => (c.rarity ?? 'common') === r).length;
      expect([n('common'), n('rare'), n('epic')], type).toEqual([3, 2, 2]);
    }
  });

  it('共通カードは24枚（コモン10・レア8・エピック6）で、どのジョブの候補にも入る', () => {
    const common = CARDS.all.filter((c) => c.common);
    expect(common).toHaveLength(24);
    const n = (r: string) => common.filter((c) => (c.rarity ?? 'common') === r).length;
    expect([n('common'), n('rare'), n('epic')]).toEqual([10, 8, 6]);
    for (const cls of CLASSES.all) {
      const pool = heroCardPool(newGame([cls.id]).heroes[0]);
      for (const c of common) expect(pool, `${cls.id}: ${c.id}`).toContain(c.id);
    }
  });

  it('異端カードは17枚以上で、全部エピック（特殊能力つき）', () => {
    const heresy = CARDS.all.filter((c) => c.heresy);
    expect(heresy.length).toBeGreaterThanOrEqual(17);
    for (const c of heresy) expect(c.rarity, c.id).toBe('epic');
  });

  it('基本の重み: 得意武器1・使える武器0.5・系統0.7・ジョブ専用1', () => {
    const [kn] = newGame(['darkKnight']).heroes; // 剣が得意、槌が副武器
    expect(getClass('darkKnight').weaponType).toBe('sword');
    expect(poolWeight(CARDS.get('wtSwordLunge'), kn)).toBe(1);
    expect(poolWeight(CARDS.get('lnBuStack'), kn)).toBe(0.7);
    expect(poolWeight(CARDS.get('wtSwordLunge'), { ...kn, classId: 'magicKnight' })).toBe(1);
    expect(poolWeight(CARDS.get('mightyBlow'), kn)).toBe(1);
  });

  it('候補から選ぶ時の乱数は1回だけ（引く回数が変わらない）', () => {
    const [w] = newGame(['warrior']).heroes;
    const pool = heroCardPool(w);
    for (const smart of [true, false]) {
      const a = createRng(7);
      const b = createRng(7);
      pickCard(pool, w, a, smart);
      b.next();
      expect(a.next()).toBe(b.next());
    }
  });
});
