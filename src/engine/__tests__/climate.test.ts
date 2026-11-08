// ===== 寒さ・暑さ（K4 段2）のテスト =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import type { GameCommand, GameState } from '../../types';
import { applyClimate, applyGameCommand, climateAt, createGame, heroMaxHp, livingHeroes } from '../index';

const newWorld = (seed = 3) =>
  createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: 'P1' })) });
const run = (g: GameState, cmd: GameCommand): GameState => {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
};
/** 何もない平地のマスを探し、全員をそこに置く。terrain を指定してそのマスの地形を変える */
function place(g: GameState, terrain: string): number {
  const w = g.world!;
  const i = w.tiles.findIndex((t) => !t.f && t.t === 'plains');
  w.tiles[i].t = terrain;
  for (const h of g.heroes) w.pos[h.id] = i;
  return i;
}
const hp = (g: GameState) => g.heroes.map((h) => h.hp);

describe('寒さ・暑さ', () => {
  it('climate の無い地形では何も起きない（今のシナリオは変わらない）', () => {
    const g = newWorld();
    const i = place(g, 'plains');
    expect(climateAt(g, i)).toBeUndefined();
    const before = hp(g);
    applyClimate(g);
    expect(hp(g)).toEqual(before);
  });

  it('雪原に立つとターンの終わりにHPが最大HPの割合だけ減る', () => {
    const g = newWorld();
    const i = place(g, 'snow');
    expect(climateAt(g, i)?.kind).toBe('cold');
    const before = hp(g);
    applyClimate(g);
    g.heroes.forEach((h, k) => expect(h.hp).toBe(before[k] - Math.max(1, Math.ceil(heroMaxHp(h) * BALANCE.climateDamageRatio))));
  });

  it('HPは1で止まり、倒れない', () => {
    const g = newWorld();
    place(g, 'desert');
    for (const h of g.heroes) h.hp = 2;
    applyClimate(g);
    applyClimate(g);
    expect(hp(g)).toEqual([1, 1]);
    expect(livingHeroes(g).length).toBe(2);
  });

  it('町のマスは対象外', () => {
    const g = newWorld();
    const i = g.world!.tiles.findIndex((t) => t.f?.kind === 'town');
    g.world!.tiles[i].t = 'snow';
    expect(climateAt(g, i)).toBeUndefined();
  });

  it('野営したキャラはそのターンは受けず、回復は平地の半分。ターンが終わると印は消える', () => {
    const camp = (terrain: string) => {
      const g = newWorld();
      place(g, terrain);
      g.world!.story = undefined;
      for (const h of g.heroes) h.hp = Math.floor(heroMaxHp(h) / 3);
      const id = g.world!.turn;
      const before = g.heroes.find((h) => h.id === id)!.hp;
      return { s: run(g, { type: 'WORLD_CAMP', playerId: 'P1', heroId: id }), id, before };
    };
    const snow = camp('snow');
    const plain = camp('plains');
    const heal = (c: { s: GameState; id: string; before: number }) => c.s.heroes.find((h) => h.id === c.id)!.hp - c.before;
    expect(snow.s.world!.sheltered).toEqual([snow.id]);
    expect(heal(snow)).toBeGreaterThan(0);
    expect(heal(snow)).toBeLessThan(heal(plain));
    // もう1人が待機してターンが終わる → 野営した人は減らず、待機した人は減る
    const campHp = snow.s.heroes.find((h) => h.id === snow.id)!.hp;
    const other = snow.s.heroes.find((h) => h.id !== snow.id)!;
    const otherHp = other.hp;
    const s = run(snow.s, { type: 'WORLD_WAIT', playerId: 'P1', heroId: snow.s.world!.turn });
    expect(s.world!.sheltered).toBeUndefined();
    expect(s.heroes.find((h) => h.id === snow.id)!.hp).toBe(campHp);
    expect(s.heroes.find((h) => h.id === other.id)!.hp).toBeLessThan(otherHp);
  });

  it('保存の形: sheltered が無くても動く（古い保存データ）', () => {
    const g = newWorld();
    place(g, 'ice');
    delete g.world!.sheltered;
    expect(() => applyClimate(g)).not.toThrow();
  });
});
