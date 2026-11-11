// 報酬のカードの「必ず1枚はジョブ寄り」（K7 オーナー決定）: 先頭の1枚は、ジョブ専用・系統・装備している武器種のカード
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import type { GameState, PlayerId } from '../../types';
import { createGame, createRng } from '../index';
import { heroCardPool, heroJobCardPool } from '../game/jobs';
import { rollCardOffers } from '../game/loot';

const game = (classes: string[], seed = 3): GameState =>
  createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: 'P1' as PlayerId })) });

describe('報酬のカードのジョブ寄りの1枚（K7）', () => {
  it('どのジョブにも、ジョブ寄りの候補がある（共通・異端カードは入らない）', () => {
    for (const c of CLASSES.all) {
      const g = game(['warrior']);
      const h = g.heroes[0];
      h.classId = c.id;
      const pool = heroJobCardPool(h);
      expect(pool.length, c.id).toBeGreaterThan(0);
      for (const id of pool) {
        // 区切りD: 共通カードとまとめたジョブのカード（刻み突き＝小手調べ など）は、そのジョブの候補に入る
        if (![h.classId, ...(h.jobs ?? [])].some((j) => CLASSES.get(j).cardPool.includes(id))) expect(CARDS.get(id).common, id).toBeFalsy();
        expect(CARDS.get(id).heresy, id).toBeFalsy();
        expect(heroCardPool(h)).toContain(id);
      }
    }
  });

  it('戦闘の報酬で、キャラごとの先頭の1枚はジョブ寄り。残りは今までどおりの候補から', () => {
    expect(BALANCE.cardRewardJobSlots).toBe(1);
    for (let seed = 1; seed <= 30; seed++) {
      const g = game(['thief', 'hexer', 'guardian', 'mage'], seed);
      const rng = createRng(seed);
      for (const h of g.heroes) {
        const offers = rollCardOffers(g, [h.id], rng);
        expect(offers.length).toBe(3);
        expect(heroJobCardPool(h), `${h.classId} seed${seed}`).toContain(offers[0].cardId);
        for (const o of offers) expect(heroCardPool(h)).toContain(o.cardId);
      }
    }
  });

  it('武器種は「装備している武器」のもの。前のジョブの専用カードも入る', () => {
    const g = game(['mage']);
    const h = g.heroes[0];
    h.jobs = ['mage'];
    h.classId = 'hexer';
    const pool = heroJobCardPool(h);
    for (const id of pool) {
      const c = CARDS.get(id);
      if (c.weaponType) expect(c.weaponType).toBe('staff'); // 魔道士の最初の武器（杖）をまだ持っている
    }
    for (const id of CLASSES.get('mage').cardPool.filter((x) => CARDS.has(x) && !CARDS.get(x).common && !CARDS.get(x).weaponType && !CARDS.get(x).lineage)) expect(pool).toContain(id);
  });

  it('同じ種なら、どの端末でも同じ候補になる（種付きの乱数だけを使う）', () => {
    const a = rollCardOffers(game(['thief', 'guardian'], 9), ['h0'], createRng(77));
    const b = rollCardOffers(game(['thief', 'guardian'], 9), ['h0'], createRng(77));
    expect(a).toEqual(b);
  });
});
