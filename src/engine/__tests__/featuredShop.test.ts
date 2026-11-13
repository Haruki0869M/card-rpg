// 物理の職が弱点の属性を出す道（2026-11-13 オーナーの決定・docs/tasks/break-read-plan.md §3）:
// - 「属性の付与」の装飾品5つ（熾火の指輪・嵐の指輪・氷晶の首飾り・流星の指輪・悪夢の指輪）は、どのシナリオの宝箱・戦利品・店の候補にも入る
// - 進む順で3つ目の地域の町の店に、5つのうち1つが必ず並ぶ（どれかは冒険の種で決まる。冒険の間は同じ物。値段はエピックの値段）
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { getItem } from '../../data/items';
import { SCENARIOS, getScenario } from '../../data/scenarios';
import { TOWNS } from '../../data/world';
import type { GameState, PlayerId } from '../../types';
import { createGame, createRng } from '../index';
import { rollEquipment } from '../game/loot';
import { ensureShop, featuredShopItemOf, featuredShopTownOf, townBuy } from '../game/world/town';

const RINGS = ['emberRing', 'stormRing', 'crystalNecklace', 'meteorRing', 'nightmareRing'];
const game = (scenarioId: string, seed = 3): GameState => {
  const g = createGame({ seed, scenarioId, difficulty: 'normal', party: ['warrior', 'priest'].map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: 'P1' as PlayerId })) });
  g.party = g.heroes.map((h) => h.id);
  return g;
};
const visit = (g: GameState, townId: string) => {
  g.town = { townId, heroId: g.heroes[0].id } as GameState['town'];
  g.mode = 'town';
};
/** 進む順で3つ目の地域の町（7本とも地図で確かめた。報告の表と同じ） */
const EXPECT: Record<string, string> = {
  corruptionKing: 'swampHamlet',
  frozenKingdom: 'lakeVillage',
  sandDynasty: 'caravanPost',
  clockworkEmpire: 'boilerCamp',
  cursedArchipelago: 'lighthouseHouse',
  starCastle: 'observatoryTown',
  dreamLabyrinth: 'lanternHill',
};

describe('「属性の付与」の装飾品（全シナリオ）', () => {
  it('5つとも: 能力は「属性の無い物理攻撃が、その属性になる」・エピック・シナリオの縛りが無い', () => {
    expect([...BALANCE.shopFeatured.items].sort()).toEqual([...RINGS].sort());
    for (const id of RINGS) {
      const d = getItem(id);
      expect(d.slot, id).toBe('accessory');
      expect(d.rarity, id).toBe('epic');
      expect(d.scenario, id).toBeUndefined();
      expect((d.ability?.effect as { modifier?: string }).modifier, id).toBe('convertElement');
    }
  });

  it('7本とも: どのシナリオの宝箱・戦利品（エピックの装飾品のくじ）にも、5つ全部が候補に入る', () => {
    expect(SCENARIOS.all.length).toBe(7);
    for (const sc of SCENARIOS.all) {
      const g = game(sc.id);
      const seen = new Set<string>();
      for (let s = 1; s <= 600 && seen.size < RINGS.length; s++) {
        const d = rollEquipment('epic', g.heroes, createRng(s), { scenario: sc.id, slot: 'accessory' });
        if (RINGS.includes(d.id)) seen.add(d.id);
      }
      expect([...seen].sort(), sc.id).toEqual([...RINGS].sort());
    }
  });
});

describe('3つ目の地域の町の店に、必ず1つ並ぶ', () => {
  it('7本それぞれの「進む順で3つ目の地域の町」', () => {
    for (const sc of SCENARIOS.all) {
      const town = featuredShopTownOf(sc.id);
      expect(town, sc.id).toBe(EXPECT[sc.id]);
      // その町は、進む順で3つ目の地域にある
      const map = getScenario(sc.id).map!;
      const f = map.features.find((x) => x.kind === 'town' && x.id === town)!;
      const r = map.regions.findIndex((x) => f.at[1] >= x.rows[0] && f.at[1] <= x.rows[1]);
      expect(map.regions.length - r, sc.id).toBe(BALANCE.shopFeatured.region);
    }
  });

  it('7本とも・20種: その町の店に5つのうち1つが、エピックの値段で並ぶ。ほかの町には「必ず並ぶ品」は無い', () => {
    for (const sc of SCENARIOS.all) {
      const towns = getScenario(sc.id).map!.features.filter((f) => f.kind === 'town').map((f) => f.id);
      for (let seed = 1; seed <= 20; seed++) {
        const g = game(sc.id, seed);
        for (const t of towns) {
          visit(g, t);
          g.world!.shops = {};
          const stock = ensureShop(g, createRng(seed));
          const featured = stock.items.filter((x) => x.featured);
          if (t === EXPECT[sc.id]) {
            expect(featured.length, `${sc.id} ${t} ${seed}`).toBe(1);
            expect(RINGS, `${sc.id} ${seed}`).toContain(featured[0].item.itemId);
            expect(featured[0].item.itemId).toBe(featuredShopItemOf(g));
            expect(featured[0].price).toBe(BALANCE.itemPrice.epic);
          } else expect(featured, `${sc.id} ${t}`).toEqual([]);
        }
      }
    }
    expect(TOWNS.all.length).toBeGreaterThanOrEqual(28);
  });

  it('同じ種なら同じ品。種が違えば、5つとも出る。冒険の間（入れ替え・売り切れの後）も同じ品', () => {
    const picks = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const a = featuredShopItemOf(game('corruptionKing', seed));
      const b = featuredShopItemOf(game('starCastle', seed));
      expect(a).toBe(b);
      picks.add(a);
    }
    expect([...picks].sort()).toEqual([...RINGS].sort());

    const g = game('corruptionKing', 11);
    g.heroes[0].gold = 9999;
    visit(g, 'swampHamlet');
    const first = ensureShop(g, createRng(1));
    const idx = first.items.findIndex((x) => x.featured);
    const id = first.items[idx].item.itemId;
    // 買うと売り切れ（冒険の乱数は使わない = ほかの抽選の順番は変わらない）
    expect(townBuy(g, { type: 'TOWN_BUY', playerId: 'P1', heroId: g.heroes[0].id, kind: 'item', index: idx }, createRng(1))).toBeUndefined();
    expect(g.world!.shops.swampHamlet.items[idx].sold).toBe(true);
    // 入れ替えの後も、同じ品がまた並ぶ
    g.world!.worldTurn += BALANCE.shopRefreshTurns;
    const next = ensureShop(g, createRng(2));
    const again = next.items.filter((x) => x.featured);
    expect(again.length).toBe(1);
    expect(again[0].item.itemId).toBe(id);
    expect(again[0].sold).toBeUndefined();
  });

  it('必ず並ぶ品を決めても、冒険の乱数（ほかの品の抽選）は変わらない', () => {
    const g = game('corruptionKing', 5);
    visit(g, 'swampHamlet');
    const rngA = createRng(77);
    const withF = ensureShop(g, rngA).items.filter((x) => !x.featured).map((x) => x.item.itemId);
    const saved = BALANCE.shopFeatured.region;
    (BALANCE.shopFeatured as { region: number }).region = 99;
    try {
      g.world!.shops = {};
      const rngB = createRng(77);
      const without = ensureShop(g, rngB).items.map((x) => x.item.itemId);
      expect(withF).toEqual(without);
      expect(rngA.state).toBe(rngB.state);
    } finally {
      (BALANCE.shopFeatured as { region: number }).region = saved;
    }
  });
});
