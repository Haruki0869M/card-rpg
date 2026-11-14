// 宿題6A（2026-11-14）: 決め技を持っている人は、戦闘の最初の手札に決め技が必ず1枚来る。
// 山札から引く形（手札の枚数は変わらない）。乱数は使わないので、同じ種なら同じ結果・乱数の順も崩れない。
import { describe, expect, it } from 'vitest';
import { getClass } from '../../data/classes';
import { finisherCards } from '../game/jobs';
import { createBattle } from '../index';
import { setup } from './helpers';

const deckWith = (classId: string, extra: string[]) => [
  ...getClass(classId).deck.flatMap((d) => Array.from({ length: d.count }, () => d.cardId)),
  ...extra,
].map((cardId, i) => ({ uid: `k${i}`, cardId }));

describe('決め技は、戦闘の最初の手札に必ず1枚来る', () => {
  const fin = finisherCards();
  it.each([1, 2, 3, 7, 11, 42, 99, 1234])('種 %i: 決め技を持つ人の手札に決め技が1枚あり、手札の枚数は変わらない', (seed) => {
    const base = setup(seed, ['warrior', 'mage']);
    const s0 = createBattle(base);
    const party = base.party.map((m, i) => ({ ...m, deck: deckWith(m.classId, i === 0 ? ['fxHeavenDragon'] : []) }));
    // 比べる相手: 同じ枚数で、決め技の代わりにふつうの札を入れた山札
    const filler = getClass('warrior').deck[0].cardId;
    const plain = createBattle({ ...base, party: base.party.map((m, i) => ({ ...m, deck: deckWith(m.classId, i === 0 ? [filler] : []) })) });
    const s = createBattle({ ...base, party });
    expect(s.allies[0].hand.filter((c) => fin.has(c.cardId))).toHaveLength(1);
    expect(s.allies[0].hand.length).toBe(s0.allies[0].hand.length);
    // 決め技を持たない人は変わらない・乱数の進みも同じ（決め技を入れ替えるだけで、乱数を引かない）
    expect(s.allies[1].hand.map((c) => c.cardId)).toEqual(plain.allies[1].hand.map((c) => c.cardId));
    expect(s.rngState).toBe(plain.rngState);
    // 同じ種なら同じ手札（オンライン・保存と再開で同じ結果）
    expect(createBattle({ ...base, party }).allies[0].hand).toEqual(s.allies[0].hand);
  });
  it('決め技が2枚あっても、最初の手札に入れるのは1枚だけ（山札のいちばん上と入れ替える）', () => {
    const base = setup(5, ['warrior']);
    const s = createBattle({ ...base, party: base.party.map((m) => ({ ...m, deck: deckWith(m.classId, ['fxHeavenDragon', 'fxHeavenDragon']) })) });
    const n = s.allies[0].hand.filter((c) => fin.has(c.cardId)).length;
    expect(n).toBeGreaterThanOrEqual(1);
    expect(s.allies[0].hand[0].cardId).toBe('fxHeavenDragon');
  });
});
