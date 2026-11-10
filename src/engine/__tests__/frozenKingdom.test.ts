// ===== シナリオ2「凍てつく王国」（K4 手順1: 地図・地域・町）のテスト =====
import { describe, expect, it } from 'vitest';
import { corruptionName, getScenario } from '../../data/scenarios';
import { TERMS } from '../../data/terms';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { ITEMS } from '../../data/items';
import { createRng } from '../rng';
import { QUESTS, TOWNS } from '../../data/world';
import { climateAt, createGame, nextGoalLines, rollEquipment } from '../index';

const newWorld = (seed = 5) =>
  createGame({ seed, scenarioId: 'frozenKingdom', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: 'P1' })) });

describe('凍てつく王国', () => {
  it('世界マップから始まり、町・ダンジョン・依頼が全部そろっている', () => {
    const g = newWorld();
    const w = g.world!;
    expect(w.width).toBe(8);
    expect(w.height).toBe(49);
    const sc = getScenario('frozenKingdom');
    for (const f of sc.map!.features) {
      const t = w.tiles.find((x) => x.f?.kind === f.kind && x.f.id === f.id);
      expect(t, `${f.kind}:${f.id}`).toBeDefined();
      if (f.kind === 'town') expect(TOWNS.has(f.id)).toBe(true);
      if (f.kind === 'dungeon') expect(DUNGEONS.has(f.id)).toBe(true);
    }
    for (const id of ['firewoodRun', 'frozenSoldiers', 'songStoneQuest', 'giantMineQuest']) expect(QUESTS.has(id)).toBe(true);
  });

  it('鍵3つのダンジョンと最終ダンジョンがつながっている', () => {
    const sc = getScenario('frozenKingdom');
    const keys = Object.keys(sc.story!.keys!);
    const rewards = DUNGEONS.forScenario('frozenKingdom').map((d) => d.rewardKey).filter(Boolean);
    expect(rewards.sort()).toEqual([...keys].sort());
    const finale = DUNGEONS.forScenario('frozenKingdom').find((d) => d.finale)!;
    expect([...(finale.requiresKeys ?? [])].sort()).toEqual([...keys].sort());
  });

  it('麓は暖かく、そこから北の地域は寒い', () => {
    const g = newWorld();
    const w = g.world!;
    const start = w.pos[g.heroes[0].id];
    expect(climateAt(g, start)).toBeUndefined();
    const north = w.tiles.findIndex((t, i) => !t.f && Math.floor(i / w.width) <= 20 && Math.floor(i / w.width) >= 16);
    expect(climateAt(g, north)?.kind).toBe('cold');
  });

  it('凍てつく王国だけの突発イベント5つは、ほかのシナリオには出ない', () => {
    const own = EVENTS.forScenario('frozenKingdom').filter((e) => e.where === 'random' && EVENTS.scenarioOf(e.id) === 'frozenKingdom');
    expect(own.map((e) => e.id).sort()).toEqual(['frozenBlizzard', 'frozenIceTreasure', 'frozenPetShiver', 'frozenTraveler', 'frozenWolfPup']);
    const other = EVENTS.forScenario('corruptionKing').map((e) => e.id);
    for (const e of own) expect(other).not.toContain(e.id);
  });

  it('鍵のダンジョンには、制覇後の物語（2〜3行・1行30字まで）がある。侵食の魔王も同じ', () => {
    for (const sid of ['frozenKingdom', 'corruptionKing']) {
      const keyDungeons = DUNGEONS.forScenario(sid).filter((d) => d.rewardKey);
      expect(keyDungeons.length).toBe(3);
      for (const d of keyDungeons) {
        expect(d.clearStory?.length, d.id).toBeGreaterThanOrEqual(2);
        expect(d.clearStory!.length, d.id).toBeLessThanOrEqual(3);
        for (const l of d.clearStory!) expect([...l].length, `${d.id}: ${l}`).toBeLessThanOrEqual(30);
      }
    }
  });

  it('制覇の物語の最後に、鍵の残り数と、そろったら最終ダンジョンが出る（順番は決めつけない）', () => {
    for (const [sid, finale] of [['frozenKingdom', '氷の城'], ['corruptionKing', '魔王城']] as const) {
      const g = createGame({ seed: 5, scenarioId: sid, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
      g.world!.keys = ['x'];
      expect(nextGoalLines(g)).toEqual(['鍵はあと2つ。']);
      g.world!.keys = ['x', 'y', 'z'];
      expect(nextGoalLines(g)).toEqual([`鍵がそろった。${finale}へ向かおう。`]);
    }
  });

  it('固有装備13個は、凍てつく王国の宝箱にだけ出る', () => {
    const gear = ITEMS.all.filter((i) => i.scenario === 'frozenKingdom');
    expect(gear.length).toBe(13);
    const g = newWorld();
    const seen = new Set<string>();
    for (let n = 0; n < 300; n++) {
      const rng = createRng(n + 1);
      for (const r of ['rare', 'epic', 'legend'] as const) {
        seen.add(rollEquipment(r, g.heroes, rng, { scenario: 'frozenKingdom' }).id);
        expect(rollEquipment(r, g.heroes, rng, { scenario: 'corruptionKing' }).scenario).not.toBe('frozenKingdom');
      }
    }
    expect([...seen].some((id) => gear.some((i) => i.id === id))).toBe(true);
  });

  it('「侵食度」は「冬の深さ」と呼ぶ。侵食の魔王は今までどおり', () => {
    expect(corruptionName('frozenKingdom')).toBe('冬の深さ');
    expect(corruptionName('corruptionKing')).toBe(TERMS.corruption);
    expect(corruptionName(undefined)).toBe(TERMS.corruption);
  });
});
