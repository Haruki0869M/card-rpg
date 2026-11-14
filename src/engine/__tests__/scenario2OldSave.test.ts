// ===== シナリオ2の作り直し §2-7: 古い保存（今の 8列×35行の地図の途中）=====
// 次の区切りで frozenKingdom/map.ts を 15×42 に替えた後も、「前の地図の途中の保存が読めて、最後まで遊べる」を確かめるためのテスト。
// 前の地図のデータ（作り直しの前の frozenKingdom/map.ts をそのまま写した物）で冒険を始めて保存（JSON）にし、今のデータで読み直す
import { describe, expect, it } from 'vitest';
import { getScenario } from '../../data/scenarios';
import { TERRAINS } from '../../data/world';
import type { GameState, ScenarioMapDef } from '../../types';
import { applyGameCommand, createGame, migrateGame, validateGame } from '../index';
import { playToEnd } from '../bot';
import { climateAt } from '../game/world/climate';
import { idxOf } from '../game/world/hex';
import { isWideMap, terrainDiceBonus } from '../game/world/lanes';
import { aliveScourges } from '../game/world/scourges';
import { startTileOf } from '../game/world/start';

const FK = 'frozenKingdom';

/** 作り直しの前のシナリオ2の地図（8列×35行・帯なし）。古い保存を作るためだけに使う（書き換えない） */
const OLD_MAP: ScenarioMapDef = {
  width: 8,
  height: 35,
  start: [3, 33],
  roadTerrain: 'road',
  regions: [
    {
      id: 'iceCastleWaste',
      name: '氷の城の荒野',
      intro: '空が白く凍りついている。吹き荒れる雪の向こうに、氷の城が青白くそびえていた。',
      rows: [0, 2],
      terrain: { ice: 4, snow: 2, mountain: 1 },
      climate: { kind: 'cold', ratio: 0.08 },
      enemyLevel: 10,
      encounters: [["frostGuardian", "cursedFrozenSoldier"], ["iceKnight", "frozenGhoul"], ["frostDrakeling", "iceSwordsman"]],
      rareEncounters: [["frostBellKnight"], ["frostBellKnight", "iceSwordsman"]],
      wanderers: 2,
    },
    {
      id: 'blizzardRange',
      name: '吹雪の山脈',
      intro: '吹雪が視界をふさぐ。山の斜面に、巨人の足跡が凍りついていた。',
      rows: [3, 9],
      terrain: { snow: 4, mountain: 3, ice: 1 },
      climate: { kind: 'cold', ratio: 0.07 },
      enemyLevel: 8,
      encounters: [['stormSnowOwl', 'iceSwordsman'], ["yeti", "iceSwordsman"], ["blizzardSnake", "stormIceArcher"], ["venomIceSlime", "iceSwordsman"], ["yeti", "stormIceArcher"]],
      wanderers: 4,
      chests: 3,
      events: 3,
      shrines: 1,
    },
    {
      id: 'frozenLake',
      name: '凍てついた湖',
      intro: '見渡すかぎり、凍った湖が広がっている。氷の下に、沈んだ聖堂の尖塔がかすかに見えた。',
      rows: [10, 20],
      terrain: { ice: 5, snow: 2, water: 1 },
      climate: { kind: 'cold', ratio: 0.06 },
      enemyLevel: 6,
      encounters: [['iceFisher', 'iceArcher'], ["iceSlime", "frozenGhoul"], ["frostMage", "iceArcher"], ["cursedFrozenSoldier", "iceArcher"]],
      wanderers: 7,
      chests: 3,
      events: 3,
      shrines: 1,
      randomDungeons: ['frozenCave'],
    },
    {
      id: 'birchSnowForest',
      name: '白樺の雪林',
      intro: '雪をかぶった白樺の林が続く。木々の間で、何かが雪を踏む音がする。',
      rows: [21, 27],
      terrain: { forest: 3, snow: 4, hills: 1 },
      climate: { kind: 'cold', ratio: 0.05 },
      enemyLevel: 4,
      encounters: [['frostMoth', 'snowOwl'], ["iceBat", "frozenSoldier"], ["snowOwl", "icicleBug"], ["emberFrostWolf", "frozenSoldier"], ["frostWolf", "snowOwl"]],
      rareEncounters: [["whiteStag"], ["whiteStag", "snowOwl"]],
      wanderers: 4,
      chests: 3,
      events: 3,
      shrines: 1,
    },
    {
      id: 'thawFoothills',
      name: '雪解けの麓',
      intro: '王国で最後に、わずかな温もりが残る麓。だが、冬は少しずつ迫っている。',
      rows: [28, 34],
      terrain: { plains: 5, hills: 2, forest: 1 },
      enemyLevel: 1,
      encounters: [["snowHare", "snowHare", "frostWolf"], ["frostWolf", "frostSprite"], ["snowHare", "frostSprite"]],
      wanderers: 4,
      chests: 2,
      events: 2,
      shrines: 2,
    },
  ],
  features: [
    { kind: 'town', id: 'lampVillage', at: [3, 33] },
    { kind: 'town', id: 'firewoodPost', at: [5, 25] },
    { kind: 'town', id: 'lakeVillage', at: [2, 16] },
    { kind: 'town', id: 'fortressTown', at: [5, 9] },
    { kind: 'dungeon', id: 'crystalCave', at: [2, 22] },
    { kind: 'dungeon', id: 'sunkenCathedral', at: [5, 13] },
    { kind: 'dungeon', id: 'giantMine', at: [2, 3] },
    { kind: 'dungeon', id: 'iceCastle', at: [4, 0] },
    { kind: 'landmark', id: 'songStone', at: [0, 28] },
  ],
  corruptionStages: [
    { at: 25, text: '吹雪が強まり、魔物が増える。町が襲われはじめる', spawn: 3, raid: true },
    { at: 50, text: '魔物が凶暴になる（敵のレベル+1）。町への襲撃が続く', spawn: 2, enemyLevel: 1, raid: true },
    { at: 75, text: '魔物がさらに強くなる（敵のレベル+1）。国が氷に沈みかけている', spawn: 3, enemyLevel: 1, raid: true },
    { at: 100, text: '国が永遠の氷に沈む（ゲームオーバー）' },
  ],
};

/** 前の地図で冒険を始めて、保存データ（JSON）にする。地図のデータは必ず元に戻す */
function oldSave(seed: number, n = 2): string {
  const map = getScenario(FK).map as ScenarioMapDef;
  const keep = { ...map };
  const clear = () => {
    for (const k of Object.keys(map)) delete (map as unknown as Record<string, unknown>)[k];
  };
  try {
    clear();
    Object.assign(map, structuredClone(OLD_MAP));
    const g = createGame({ seed, scenarioId: FK, difficulty: 'normal', party: Array.from({ length: n }, (_, i) => ({ classId: ['warrior', 'priest', 'mage', 'thief'][i], gender: 'male' as const, name: `仲間${i}`, playerId: `P${i + 1}` as 'P1' })) });
    expect([g.world!.width, g.world!.height]).toEqual([8, 35]);
    return JSON.stringify(g);
  } finally {
    clear();
    Object.assign(map, keep);
  }
}
const load = (raw: string): GameState => migrateGame(JSON.parse(raw))!;

describe('シナリオ2の古い保存（前の 8×35 の地図の途中）', () => {
  it('地図は作り直さない。スタートは灯火の村。帯・街道ボーナスは使わない。検査も通る', () => {
    const g = load(oldSave(5));
    expect(g).not.toBeNull();
    expect(validateGame(g)).toBe(true);
    const w = g.world!;
    expect([w.width, w.height]).toEqual([8, 35]);
    expect(isWideMap(g, w)).toBe(false);
    const start = startTileOf(g, w);
    expect(start).toBe(idxOf(w, 3, 33));
    expect(w.tiles[start].f).toEqual({ kind: 'town', id: 'lampVillage' });
    expect(terrainDiceBonus(g, w, start)).toEqual([]);
    // 前の地図の施設（町・ダンジョン・歌碑）が全部ある
    for (const f of OLD_MAP.features) expect(w.tiles[idxOf(w, f.at[0], f.at[1])].f, `${f.kind}:${f.id}`).toEqual({ kind: f.kind, id: f.id });
    w.story = undefined;
    const h = g.heroes[0];
    const r = applyGameCommand(g, { type: 'WORLD_ROLL_MOVE', playerId: h.playerId, heroId: h.id });
    expect(r.error).toBeUndefined();
    expect(r.state.world!.moveDice!.bonus.some((b) => b.label === '街道')).toBe(false);
  });

  it('地域は前の5つの並びのまま読める（マスの地域の番号が、今のデータの同じ地域を指す）。寒さは前の決まりのまま', () => {
    const g = load(oldSave(6));
    const w = g.world!;
    const now = getScenario(FK).map!.regions;
    expect(now.map((r) => r.id)).toEqual(OLD_MAP.regions.map((r) => r.id));
    for (let i = 0; i < w.tiles.length; i++) {
      const t = w.tiles[i];
      expect(TERRAINS.has(t.t), t.t).toBe(true);
      if (t.f?.kind === 'town') continue;
      expect(climateAt(g, i), `tile ${i}`).toEqual(TERRAINS.get(t.t).climate ?? now[t.r].climate);
    }
    // 麓は暖かく、湖は寒い
    expect(climateAt(g, startTileOf(g, w))).toBeUndefined();
  });

  it('災厄は出ない（広い地図ではない）。保存・読み直しで何も足さない', () => {
    let g = load(oldSave(7));
    expect(g.world!.scourgeCount).toBeUndefined();
    g.world!.story = undefined;
    g.world!.keys = ['x'];
    g.world!.corruption = 60;
    for (let k = 0; k < 2; k++) {
      const start = g.world!.worldTurn;
      for (let s = 0; s < 10 && g.world!.worldTurn === start && g.mode === 'world'; s++) {
        if (g.world!.story) g = applyGameCommand(g, { type: 'STORY_CONTINUE', playerId: 'P1' }).state;
        const h = g.heroes.find((x) => x.id === g.world!.turn)!;
        g = applyGameCommand(g, { type: 'WORLD_WAIT', playerId: h.playerId, heroId: h.id }).state;
      }
    }
    expect(aliveScourges(g.world)).toHaveLength(0);
    expect(g.world!.scourgeCount).toBeUndefined();
    const again = load(JSON.stringify(g));
    expect(JSON.stringify(again.world)).toBe(JSON.stringify(g.world));
  });

  it('前の地図の途中から、自動プレイで最後まで止まらずに遊べる（2人・4人）', () => {
    for (const n of [2, 4]) {
      const g = load(oldSave(11, n));
      const { game, log } = playToEnd(g, 60000, { straight: true });
      expect(log.errors, `${n}人`).toEqual([]);
      expect(['ending', 'gameover'], `${n}人`).toContain(game.mode);
      expect([game.world!.width, game.world!.height]).toEqual([8, 35]);
    }
  }, 180000);
});
