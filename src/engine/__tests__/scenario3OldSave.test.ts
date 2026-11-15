// ===== シナリオ3の作り直し §3-7: 古い保存（今の 8列×35行の地図の途中）=====
// 次の区切りで cursedArchipelago/map.ts を 15×42 に替えた後も、「前の地図の途中の保存が読めて、最後まで遊べる」を確かめるためのテスト。
// 前の地図のデータ（作り直しの前の cursedArchipelago/map.ts をそのまま写した物）で冒険を始めて保存（JSON）にし、今のデータで読み直す。
// 手本はシナリオ2の scenario2OldSave.test.ts
import { describe, expect, it } from 'vitest';
import { getScenario } from '../../data/scenarios';
import { TERRAINS } from '../../data/world';
import type { GameState, ScenarioMapDef } from '../../types';
import { applyGameCommand, createGame, migrateGame, validateGame } from '../index';
import { playToEnd } from '../bot';
import { idxOf, moveCostOf, neighbors } from '../game/world/hex';
import { isWideMap, terrainDiceBonus } from '../game/world/lanes';
import { aliveScourges } from '../game/world/scourges';
import { startTileOf } from '../game/world/start';
import { tideStatus } from '../game/world/tide';

const CA = 'cursedArchipelago';

/** 作り直しの前のシナリオ3の地図（8列×35行・帯なし・潮なし）。古い保存を作るためだけに使う（書き換えない） */
const OLD_MAP: ScenarioMapDef = {
  width: 8,
  height: 35,
  start: [3, 33],
  roadTerrain: 'road',
  landAround: 1,
  regions: [
    {
      id: 'wreckSea',
      name: '沈没船の海',
      intro: '霧の奥に、折れたマストの影が並ぶ。ここが、幽霊船団の巣だ。',
      rows: [0, 2],
      terrain: { sea: 6, swamp: 1, mountain: 1 },
      enemyLevel: 10,
      encounters: [['lanternAngler', 'ghostDeckhand'], ['barnacleBeast', 'cursedDrownedSailor'], ['barnacleBeast', 'conchKnight']],
      seaEncounters: [['venomShark', 'ghostDeckhand'], ['venomShark', 'stormPetrel', 'drownedSailor']],
      seaWanderers: 2,
      wanderers: 1,
    },
    {
      id: 'cursedIsles',
      name: '呪われた島々',
      intro: '黒い岩の島が点在している。島の奥で、何かが海を見つめている。',
      rows: [3, 9],
      terrain: { sea: 4, forest: 2, hills: 2, swamp: 1 },
      enemyLevel: 8,
      encounters: [['cursedPirateGrunt', 'octopusLarva'], ['conchKnight', 'cursedDrownedSailor'], ['octopusLarva', 'stormPetrel'], ['drownedKnight', 'octopusLarva']],
      seaEncounters: [['shark', 'stormPetrel'], ['cursedDrownedSailor', 'siren']],
      seaWanderers: 4,
      wanderers: 4,
      chests: 3,
      events: 3,
      shrines: 1,
    },
    {
      id: 'mistSea',
      name: '霧の海域',
      intro: '濃い霧の中、波の音だけが聞こえる。時おり、遠くで鐘が鳴った。',
      rows: [10, 20],
      terrain: { sea: 7, hills: 1, forest: 1 },
      enemyLevel: 6,
      encounters: [['pirateGrunt', 'pirateGunner'], ['drownedSailor', 'pirateGunner'], ['ghostDeckhand', 'pirateGrunt', 'pirateGunner']],
      rareEncounters: [['lanternGhostCaptain'], ['lanternGhostCaptain', 'pirateGunner']],
      seaEncounters: [['ghostDeckhand', 'siren'], ['stormJellyfish', 'drownedSailor'], ['siren', 'jellyfish', 'stormJellyfish']],
      seaWanderers: 6,
      wanderers: 3,
      chests: 3,
      events: 3,
      shrines: 1,
      randomDungeons: ['tideCave'],
    },
    {
      id: 'coralShallows',
      name: '珊瑚の浅瀬',
      intro: '透き通った浅い海に、色とりどりの珊瑚が揺れている。小さな島が、あちこちに浮かんでいる。',
      rows: [21, 27],
      terrain: { sea: 4, plains: 3, hills: 1, forest: 1 },
      enemyLevel: 4,
      encounters: [['driftwoodSpirit', 'merfolkSpearman'], ['merfolkSpearman', 'pirateGrunt'], ['seaCrab', 'emberSeaCrab'], ['merfolkSpearman', 'merfolkSpearman', 'emberSeaCrab']],
      seaEncounters: [['jellyfish', 'seaSerpentFry'], ['seaSerpentFry', 'emberSeaCrab']],
      seaWanderers: 4,
      wanderers: 4,
      chests: 3,
      events: 3,
      shrines: 1,
    },
    {
      id: 'harborIsle',
      name: '港の島',
      intro: '群島でいちばん大きな島。港には、霧を恐れて出航できない船が並んでいる。',
      rows: [28, 34],
      terrain: { plains: 5, forest: 1, hills: 1, sea: 2 },
      enemyLevel: 1,
      encounters: [['seaCrab', 'pirateGrunt'], ['pirateGrunt', 'seaCrab', 'pirateGrunt'], ['seaCrab', 'pirateGrunt', 'seaCrab']],
      rareEncounters: [['pearlCrab'], ['pearlCrab', 'pirateGrunt']],
      wanderers: 4,
      chests: 2,
      events: 2,
      shrines: 2,
    },
  ],
  features: [
    { kind: 'town', id: 'harborTown', at: [3, 33] },
    { kind: 'town', id: 'coralVillage', at: [5, 25] },
    { kind: 'town', id: 'lighthouseHouse', at: [2, 16] },
    { kind: 'town', id: 'wreckTown', at: [5, 9] },
    { kind: 'dungeon', id: 'wreckCave', at: [2, 22] },
    { kind: 'dungeon', id: 'pirateIsland', at: [5, 13] },
    { kind: 'dungeon', id: 'sunkenTemple', at: [2, 3] },
    { kind: 'dungeon', id: 'ghostFlagship', at: [4, 0] },
    { kind: 'landmark', id: 'tideStone', at: [0, 28] },
  ],
  corruptionStages: [
    { at: 25, text: '霧が濃くなり、幽霊船が増える。港町が襲われはじめる', spawn: 3, raid: true },
    { at: 50, text: '魔物が凶暴になる（敵のレベル+1）。町への襲撃が続く', spawn: 2, enemyLevel: 1, raid: true },
    { at: 75, text: '魔物がさらに強くなる（敵のレベル+1）。群島が霧に沈みかけている', spawn: 3, enemyLevel: 1, raid: true },
    { at: 100, text: '群島が永遠の霧に沈む（ゲームオーバー）' },
  ],
};

/** 前の地図で冒険を始めて、保存データ（JSON）にする。地図のデータは必ず元に戻す。tideStoneEvent = 石碑の直しの前の冒険（ふつうのイベントとして石碑が置かれていた） */
function oldSave(seed: number, n = 2, tideStoneEvent = false): string {
  const map = getScenario(CA).map as ScenarioMapDef;
  const keep = { ...map };
  const clear = () => {
    for (const k of Object.keys(map)) delete (map as unknown as Record<string, unknown>)[k];
  };
  try {
    clear();
    Object.assign(map, structuredClone(OLD_MAP));
    const g = createGame({ seed, scenarioId: CA, difficulty: 'normal', party: Array.from({ length: n }, (_, i) => ({ classId: ['warrior', 'priest', 'mage', 'thief'][i], gender: 'male' as const, name: `仲間${i}`, playerId: `P${i + 1}` as 'P1' })) });
    expect([g.world!.width, g.world!.height]).toEqual([8, 35]);
    if (tideStoneEvent) {
      // 石碑の直しの前は、潮騒の石碑がふつうのイベントとしても置かれていた: スタートの隣の空きマスに1つ置く
      const w = g.world!;
      const s = startTileOf(g, w);
      const spot = neighbors(w, s).find((i) => !w.tiles[i].f && TERRAINS.get(w.tiles[i].t).moveCost > 0)!;
      w.tiles[spot].f = { kind: 'event', id: 'tideStone' };
    }
    return JSON.stringify(g);
  } finally {
    clear();
    Object.assign(map, keep);
  }
}
const load = (raw: string): GameState => migrateGame(JSON.parse(raw))!;

describe('シナリオ3の古い保存（前の 8×35 の地図の途中）', () => {
  it('地図は作り直さない。スタートは港町。帯・街道ボーナス・潮の札は使わない。検査も通る', () => {
    const g = load(oldSave(5));
    expect(g).not.toBeNull();
    expect(validateGame(g)).toBe(true);
    const w = g.world!;
    expect([w.width, w.height]).toEqual([8, 35]);
    expect(isWideMap(g, w)).toBe(false);
    const start = startTileOf(g, w);
    expect(start).toBe(idxOf(w, 3, 33));
    expect(w.tiles[start].f).toEqual({ kind: 'town', id: 'harborTown' });
    expect(terrainDiceBonus(g, w, start)).toEqual([]);
    // 前の地図の施設（町・ダンジョン・石碑）が全部ある
    for (const f of OLD_MAP.features) expect(w.tiles[idxOf(w, f.at[0], f.at[1])].f, `${f.kind}:${f.id}`).toEqual({ kind: f.kind, id: f.id });
    // 潮のマス・印は無い（潮の札も出ない）。移動力は今までどおり
    expect(w.tiles.some((t) => TERRAINS.get(t.t).tide || t.tideIn)).toBe(false);
    expect(tideStatus(w)).toBeUndefined();
    for (let i = 0; i < w.tiles.length; i += 3) for (const n of neighbors(w, i)) expect(moveCostOf(w, n, i)).toBe(moveCostOf(w, n));
    w.story = undefined;
    const h = g.heroes[0];
    const r = applyGameCommand(g, { type: 'WORLD_ROLL_MOVE', playerId: h.playerId, heroId: h.id });
    expect(r.error).toBeUndefined();
    expect(r.state.world!.moveDice!.bonus.some((b) => b.label === '街道')).toBe(false);
  });

  it('地域は前の5つの並びのまま読める。ランダムダンジョン（潮騒の洞窟）・海のマスもある', () => {
    const g = load(oldSave(6));
    const w = g.world!;
    const now = getScenario(CA).map!.regions;
    expect(now.map((r) => r.id)).toEqual(OLD_MAP.regions.map((r) => r.id));
    for (const t of w.tiles) expect(TERRAINS.has(t.t), t.t).toBe(true);
    expect(w.tiles.some((t) => t.f?.kind === 'dungeon' && t.f.id === 'tideCave')).toBe(true);
    expect(w.tiles.some((t) => TERRAINS.get(t.t).sea)).toBe(true);
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
    expect(g.world!.tideFrozen).toBeUndefined();
    const again = load(JSON.stringify(g));
    expect(JSON.stringify(again.world)).toBe(JSON.stringify(g.world));
  });

  it('石碑の直しの前の保存: ふつうのイベントとして置かれた潮騒の石碑も、今までどおり調べられる', () => {
    let g = load(oldSave(8, 1, true));
    g.world!.story = undefined;
    const w = g.world!;
    const spot = w.tiles.findIndex((t) => t.f?.kind === 'event' && t.f.id === 'tideStone');
    expect(spot).toBeGreaterThanOrEqual(0);
    const h = g.heroes[0];
    w.pos[h.id] = spot;
    const r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: h.playerId, heroId: h.id, party: [h.id] });
    expect(r.error).toBeUndefined();
    g = r.state;
    expect(g.mode).toBe('event');
    expect(g.event!.eventId).toBe('tideStone');
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
