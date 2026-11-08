// ===== 追加シナリオ（K4）の共通の決まりのテスト =====
// 町・ダンジョン・依頼・鍵・制覇後の物語・ボス手前の物語の部屋・固有装備・シナリオ限定の突発イベントがそろっているか
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { ITEMS } from '../../data/items';
import { getScenario } from '../../data/scenarios';
import { QUESTS, SHRINES, TOWNS } from '../../data/world';
import { createGame } from '../index';

/** [シナリオID, 固有装備の数, 前の本（解放条件）, このシナリオだけの突発イベントのID] */
const PACKS: [string, number, string, string[]][] = [
  ['frozenKingdom', 13, 'corruptionKing', ['frozenBlizzard', 'frozenTraveler', 'frozenIceTreasure', 'frozenWolfPup', 'frozenPetShiver']],
  ['cursedArchipelago', 13, 'frozenKingdom', ['seaStorm', 'seaDriftingSailor', 'seaFloatingChest', 'seaDolphin', 'mistPetSeasick']],
  ['sandDynasty', 13, 'cursedArchipelago', ['sandStorm', 'sandLostCaravan', 'sandMirage', 'sandFennec', 'sandPetHeat']],
  ['starCastle', 13, 'sandDynasty', ['skyGust', 'starShower', 'starLostAstronomer', 'starBirdOnCloud', 'skyPetStarGazer']],
];

describe.each(PACKS)('追加シナリオ %s', (sid, gearCount, prev, randomIds) => {
  const sc = getScenario(sid);

  it('町・ダンジョン・依頼・祠がそろい、鍵3つで最終ダンジョンが開く', () => {
    for (const f of sc.map!.features) {
      if (f.kind === 'town') expect(TOWNS.has(f.id), f.id).toBe(true);
      if (f.kind === 'dungeon') expect(DUNGEONS.has(f.id), f.id).toBe(true);
    }
    const towns = sc.map!.features.filter((f) => f.kind === 'town');
    expect(towns.length).toBe(4);
    for (const t of towns) for (const q of TOWNS.get(t.id).quests ?? []) expect(QUESTS.has(q), q).toBe(true);
    const keys = Object.keys(sc.story!.keys!);
    expect(keys.length).toBe(3);
    const ds = DUNGEONS.forScenario(sid);
    expect(ds.map((d) => d.rewardKey).filter(Boolean).sort()).toEqual([...keys].sort());
    expect([...(ds.find((d) => d.finale)!.requiresKeys ?? [])].sort()).toEqual([...keys].sort());
    expect(ds.filter((d) => d.random).length).toBe(1);
    expect(SHRINES.forScenario(sid).filter((s) => SHRINES.scenarioOf(s.id) === sid).length).toBe(4);
  });

  it('制覇後の物語（2〜3行・1行30字まで）と、ボス手前の物語の部屋がある', () => {
    const ds = DUNGEONS.forScenario(sid);
    for (const d of ds.filter((x) => x.rewardKey)) {
      expect(d.clearStory!.length, d.id).toBeGreaterThanOrEqual(2);
      expect(d.clearStory!.length, d.id).toBeLessThanOrEqual(3);
      for (const l of d.clearStory!) expect([...l].length, `${d.id}: ${l}`).toBeLessThanOrEqual(30);
    }
    for (const d of ds.filter((x) => x.layout)) {
      const rows = d.layout!;
      expect(rows[rows.length - 1][0].type, d.id).toBe('boss');
      expect(rows[rows.length - 2].some((r) => r.type === 'event'), d.id).toBe(true);
      for (const row of rows) for (const r of row) if (r.eventId) expect(EVENTS.has(r.eventId), r.eventId).toBe(true);
    }
  });

  it('固有装備と突発イベントは、このシナリオだけで使われる', () => {
    expect(ITEMS.all.filter((i) => i.scenario === sid).length).toBe(gearCount);
    for (const id of randomIds) {
      expect(EVENTS.forScenario(sid).map((e) => e.id), id).toContain(id);
      for (const [other] of PACKS) if (other !== sid) expect(EVENTS.forScenario(other).map((e) => e.id), `${other} に ${id}`).not.toContain(id);
      expect(EVENTS.forScenario('corruptionKing').map((e) => e.id)).not.toContain(id);
    }
  });

  it('前の本をクリアすると解放される。世界マップから始められる', () => {
    expect(sc.unlockRequires).toEqual({ cleared: [prev] });
    const g = createGame({ seed: 3, scenarioId: sid, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
    expect(g.world).toBeDefined();
    expect(g.world!.width).toBe(8);
  });
});
