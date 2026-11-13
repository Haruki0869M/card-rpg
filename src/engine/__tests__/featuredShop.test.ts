// 物理の職が弱点の属性を出す道（2026-11-13 オーナーの決定・docs/tasks/break-read-plan.md §3）:
// - 「属性の付与」の装飾品5つ（熾火の指輪・嵐の指輪・氷晶の首飾り・流星の指輪・悪夢の指輪）は、どのシナリオの宝箱・戦利品・店の候補にも入る
// - 進む順で3つ目の地域の町の店に、5つのうち1つが必ず並ぶ（どれかは冒険の種で決まる。冒険の間は同じ物。値段はエピックの値段）
// - 2026-11-13（点検19の 3-2）: 選ぶのは、そのシナリオの後半の大物の弱点に合う物だけ（重み = 弱点の大物の数）。合う物が無ければ5つから
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { getItem } from '../../data/items';
import { DUNGEONS, isFirstKeyDungeon } from '../../data/dungeons';
import { getEnemy } from '../../data/enemies';
import { SCENARIOS, getScenario } from '../../data/scenarios';
import { TOWNS } from '../../data/world';
import type { GameState, PlayerId } from '../../types';
import { createGame, createRng } from '../index';
import { rollEquipment } from '../game/loot';
import { ensureShop, featuredShopCandidatesOf, featuredShopItemOf, featuredShopTownOf, lateBigEnemiesOf, townBuy } from '../game/world/town';

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

  it('同じ種なら同じ品。種が違えば、候補が全部出る。冒険の間（入れ替え・売り切れの後）も同じ品', () => {
    for (const sc of SCENARIOS.all) {
      const picks = new Set<string>();
      for (let seed = 1; seed <= 200; seed++) {
        const a = featuredShopItemOf(game(sc.id, seed));
        expect(featuredShopItemOf({ seed, scenarioId: sc.id })).toBe(a);
        picks.add(a);
      }
      expect([...picks].sort(), sc.id).toEqual(featuredShopCandidatesOf(sc.id).map((c) => c.itemId).sort());
    }

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

  // 2026-11-13（点検19の 3-2・オーナーの OK）: 後半の大物（2つ目・3つ目の鍵のボス・最後の中ボスとボス）の弱点に合う物だけから、
  // 弱点の大物の数の重みで選ぶ。下の表は、データから自動で作った候補を、報告のために書き写した物（決め方は town.ts がデータから作る）
  const LATE_WEAK: Record<string, Record<string, number>> = {
    corruptionKing: { stormRing: 2, crystalNecklace: 1, meteorRing: 3 },
    frozenKingdom: { emberRing: 3, stormRing: 2, meteorRing: 1, nightmareRing: 2 },
    cursedArchipelago: { emberRing: 1, stormRing: 3, meteorRing: 3, nightmareRing: 1 },
    sandDynasty: { emberRing: 1, stormRing: 3, meteorRing: 2 },
    starCastle: { nightmareRing: 5 },
    clockworkEmpire: { stormRing: 3, crystalNecklace: 2 },
    dreamLabyrinth: { emberRing: 1, meteorRing: 5 },
  };

  it('7本とも: 後半の大物は、2つ目・3つ目の鍵のボスと最後の中ボス・ボス（1つ目の鍵のボス・ランダムダンジョンは入らない）', () => {
    for (const sc of SCENARIOS.all) {
      const ds = DUNGEONS.forScenario(sc.id);
      const want = [
        ...ds.filter((d) => !d.random && d.rewardKey && d.requiresKeys?.length).flatMap((d) => d.pools.boss),
        ...ds.filter((d) => d.finale).flatMap((d) => [...(d.pools.midboss ?? []), ...d.pools.boss]),
      ];
      expect(lateBigEnemiesOf(sc.id).sort(), sc.id).toEqual(want.sort());
      // 鍵のボス2体＋最後の中ボスの部屋の2体＋最後のボス1体
      expect(want.length, sc.id).toBe(5);
      const first = ds.find((d) => isFirstKeyDungeon(d))!;
      for (const id of first.pools.boss) expect(lateBigEnemiesOf(sc.id), sc.id).not.toContain(id);
    }
  });

  it('7本とも: 選ばれうる品は、後半の大物の弱点に合う物だけ（重み = その属性が弱点の大物の数）', () => {
    for (const sc of SCENARIOS.all) {
      const bigs = lateBigEnemiesOf(sc.id).map((id) => getEnemy(id));
      const cand = featuredShopCandidatesOf(sc.id);
      expect(Object.fromEntries(cand.map((c) => [c.itemId, c.weight])), sc.id).toEqual(LATE_WEAK[sc.id]);
      for (const c of cand) {
        const el = (getItem(c.itemId).ability!.effect as { into: string }).into;
        expect(c.weight, `${sc.id} ${c.itemId}`).toBe(bigs.filter((e) => e.weak?.includes(el)).length);
        expect(c.weight).toBeGreaterThan(0);
      }
      // 合わない物は候補に無い
      for (const id of RINGS.filter((r) => !cand.some((c) => c.itemId === r))) {
        const el = (getItem(id).ability!.effect as { into: string }).into;
        expect(bigs.some((e) => e.weak?.includes(el)), `${sc.id} ${id}`).toBe(false);
      }
      // 種を変えると、重みのとおりの割合で出る（2000種で ±4%）
      const n = 2000;
      const counts: Record<string, number> = {};
      for (let seed = 1; seed <= n; seed++) {
        const id = featuredShopItemOf({ seed, scenarioId: sc.id });
        counts[id] = (counts[id] ?? 0) + 1;
      }
      const total = cand.reduce((a, c) => a + c.weight, 0);
      for (const c of cand) expect(Math.abs(counts[c.itemId] / n - c.weight / total), `${sc.id} ${c.itemId}`).toBeLessThan(0.04);
      expect(Object.keys(counts).every((id) => cand.some((c) => c.itemId === id)), sc.id).toBe(true);
    }
  });

  it('合う物が無いシナリオは、今までどおり5つから（毒が弱点の大物は数えない）', () => {
    // このテストの間だけ、星降る天空城の後半の大物の弱点を「毒」だけにする
    const bigs = lateBigEnemiesOf('starCastle').map((id) => getEnemy(id) as { weak?: string[] });
    const saved = bigs.map((e) => e.weak);
    try {
      for (const e of bigs) e.weak = ['poison'];
      expect(featuredShopCandidatesOf('starCastle')).toEqual(RINGS.map((itemId) => ({ itemId, weight: 1 })));
      const picks = new Set<string>();
      for (let seed = 1; seed <= 100; seed++) picks.add(featuredShopItemOf({ seed, scenarioId: 'starCastle' }));
      expect([...picks].sort()).toEqual([...RINGS].sort());
    } finally {
      bigs.forEach((e, i) => (e.weak = saved[i]));
    }
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
