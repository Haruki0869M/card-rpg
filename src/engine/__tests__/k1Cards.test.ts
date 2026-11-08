// K1 スキルカード: 武器種カード・系統カード・異端カードの候補と決まり
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../data/cards';
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
      if (c.heresy) expect(c.weaponType ?? c.lineage, `${c.id}: 異端に武器種・系統は付けない`).toBeUndefined();
      if (c.weaponType || c.lineage || c.heresy) {
        // エピック以上は特殊能力が必須
        if (['epic', 'legend'].includes(c.rarity ?? 'common')) expect(c.trait, c.id).toBeDefined();
        expect(c.tiers[0].minSuccesses, c.id).toBe(0);
      }
    }
  });

  it('剣は7枚、武は15枚（コモン6・レア5・エピック4）', () => {
    const sword = CARDS.all.filter((c) => c.weaponType === 'sword');
    expect(sword).toHaveLength(7);
    const bu = CARDS.all.filter((c) => c.lineage === 'bu');
    expect(bu).toHaveLength(15);
    const n = (r: string) => bu.filter((c) => (c.rarity ?? 'common') === r).length;
    expect([n('common'), n('rare'), n('epic')]).toEqual([6, 5, 4]);
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
