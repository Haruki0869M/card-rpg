// K3 C: レアの敵10体（地域の rareEncounters）と、隠しボス4体（隠しボスの名所のイベント）
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getScenario } from '../../data/scenarios';
import { createGame } from '../index';
import { pickRandomEvent } from '../game/world/world';
import { createRng } from '../index';

const RARE: Record<string, [string, string]> = {
  goldenWolf: ['corruptionKing', 'forest'],
  crystalGhoul: ['corruptionKing', 'swamp'],
  whiteStag: ['frozenKingdom', 'birchSnowForest'],
  frostBellKnight: ['frozenKingdom', 'iceCastleWaste'],
  pearlCrab: ['cursedArchipelago', 'harborIsle'],
  lanternGhostCaptain: ['cursedArchipelago', 'mistSea'],
  goldenScarab: ['sandDynasty', 'duneSea'],
  starlitSwan: ['starCastle', 'starHill'],
  brassClockCat: ['clockworkEmpire', 'chimneyTownArea'],
  crimsonSteamHound: ['clockworkEmpire', 'steamValley'],
};
const HIDDEN: Record<string, { scenario: string; region: string; event: string; level: number }> = {
  hollowDemonLord: { scenario: 'corruptionKing', region: 'castleRegion', event: 'hollowDemonShadow', level: 11 },
  drownedBride: { scenario: 'cursedArchipelago', region: 'mistSea', event: 'drownedBrideVeil', level: 9 },
  fallenStarSerpent: { scenario: 'starCastle', region: 'starHill', event: 'fallenStarNest', level: 8 },
  ancientEngineHeart: { scenario: 'clockworkEmpire', region: 'powerPlant', event: 'ancientEngineRoom', level: 10 },
};
const region = (scenario: string, id: string) => getScenario(scenario).map!.regions.find((r) => r.id === id)!;
const newGame = (scenarioId: string, seed: number) =>
  createGame({ seed, scenarioId, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });

describe('K3 C レアの敵', () => {
  it('10体とも★の印が付き、特殊能力を1つ持ち、決めた地域のレアの組に入る', () => {
    for (const [id, [scenario, reg]] of Object.entries(RARE)) {
      const e = ENEMIES.get(id);
      expect(e.rare, id).toBe(true);
      expect(e.variantOf, id).toBeUndefined();
      expect(e.abilities?.length, id).toBe(1);
      const groups = region(scenario, reg).rareEncounters ?? [];
      expect(groups.length, id).toBeGreaterThan(0);
      for (const g of groups) {
        expect(g).toContain(id);
        for (const x of g) expect(ENEMIES.has(x), x).toBe(true);
      }
    }
  });

  it('同じ地域の通常の敵より経験値・ゴールドが多い（約3倍）', () => {
    for (const [id, [scenario, reg]] of Object.entries(RARE)) {
      const e = ENEMIES.get(id);
      const normals = region(scenario, reg).encounters.flat().map((x) => ENEMIES.get(x)).filter((x) => !x.rare && x.baseLevel <= e.baseLevel + 1);
      const maxExp = Math.max(...normals.map((x) => x.exp * (e.baseLevel / x.baseLevel)));
      expect(e.exp, id).toBeGreaterThanOrEqual(maxExp * 1.5);
    }
  });
});

describe('K3 C 隠しボス', () => {
  it('4体とも最終ボス並みで、HPが半分を切ると変身する', () => {
    for (const [id, h] of Object.entries(HIDDEN)) {
      const e = ENEMIES.get(id);
      expect(e.phases?.map((p) => p.belowHpPct), id).toEqual([50]);
      expect(e.maxHp, id).toBeGreaterThanOrEqual(300);
      expect(e.abilities?.length, id).toBeGreaterThan(0);
      expect(e.baseLevel, id).toBe(h.level);
    }
  });

  it('名所のイベントは、戦うとその隠しボスが出て、勝つとエピック以上の装備が出る', () => {
    for (const [id, h] of Object.entries(HIDDEN)) {
      const ev = EVENTS.get(h.event);
      expect(ev.where).toBe('map');
      expect(ev.hiddenIn).toBe(h.region);
      expect(EVENTS.forScenario(h.scenario).some((x) => x.id === h.event), h.event).toBe(true);
      const fight = ev.options[0].success[0] as { kind: string; enemies: { defId: string; level: number }[]; onWin: { kind: string; rarity: string }[] };
      expect(fight.kind).toBe('battle');
      expect(fight.enemies).toEqual([{ defId: id, level: h.level }]);
      expect(fight.onWin).toEqual([{ kind: 'item', rarity: 'epic' }]);
      expect(ev.options.length).toBe(2);
    }
  });

  it('新しい地図では、決めた地域にちょうど1つ置かれる（種を変えても）', () => {
    for (const h of Object.values(HIDDEN)) {
      const ri = getScenario(h.scenario).map!.regions.findIndex((r) => r.id === h.region);
      for (const seed of [1, 7, 42]) {
        const w = newGame(h.scenario, seed).world!;
        const tiles = w.tiles.filter((t) => t.f?.id === h.event);
        expect(tiles.length, `${h.scenario} ${seed}`).toBe(1);
        expect(tiles[0].r).toBe(ri);
      }
    }
  });

  it('同じ種なら同じ場所（オンラインでも全員同じ地図）', () => {
    for (const h of Object.values(HIDDEN)) {
      const at = (seed: number) => newGame(h.scenario, seed).world!.tiles.findIndex((t) => t.f?.id === h.event);
      expect(at(5)).toBe(at(5));
    }
  });

  it('ふつうの名所のくじと、突発イベントには出ない', () => {
    for (const h of Object.values(HIDDEN)) {
      for (const seed of [1, 7, 42]) {
        const w = newGame(h.scenario, seed).world!;
        expect(w.tiles.filter((t) => t.f?.id === h.event).length).toBe(1);
      }
      const g = newGame(h.scenario, 3);
      const rng = createRng(9);
      for (let i = 0; i < 200; i++) expect(pickRandomEvent(g, rng)).not.toBe(h.event);
    }
  });
});
