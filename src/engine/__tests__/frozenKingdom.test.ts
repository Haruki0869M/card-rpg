// ===== シナリオ2「凍てつく王国」（K4 手順1: 地図・地域・町）のテスト =====
import { describe, expect, it } from 'vitest';
import { corruptionName, getScenario } from '../../data/scenarios';
import { TERMS } from '../../data/terms';
import { DUNGEONS } from '../../data/dungeons';
import { QUESTS, TOWNS } from '../../data/world';
import { climateAt, createGame } from '../index';

const newWorld = (seed = 5) =>
  createGame({ seed, scenarioId: 'frozenKingdom', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: 'P1' })) });

describe('凍てつく王国', () => {
  it('世界マップから始まり、町・ダンジョン・依頼が全部そろっている', () => {
    const g = newWorld();
    const w = g.world!;
    expect(w.width).toBe(8);
    expect(w.height).toBe(28);
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

  it('「侵食度」は「冬の深さ」と呼ぶ。侵食の魔王は今までどおり', () => {
    expect(corruptionName('frozenKingdom')).toBe('冬の深さ');
    expect(corruptionName('corruptionKing')).toBe(TERMS.corruption);
    expect(corruptionName(undefined)).toBe(TERMS.corruption);
  });
});
