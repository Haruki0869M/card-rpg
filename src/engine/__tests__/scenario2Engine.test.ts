// ===== シナリオ2の作り直し 区切り1（docs/tasks/scenario2-rework-plan.md §2-1・§2-2・§2-7）=====
// エンジンの小さな直し（帯の寒さの倍率・湖の氷・薬草のイベントの id・災厄の帯とシナリオの欄・災厄の文の悪化の名前）と、
// シナリオ1の動き（地図・災厄の種類・場所・乱数の順番・文）が変わらない事。
// 古い保存のテスト（§2-7）は scenario2OldSave.test.ts
import { afterEach, describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { EVENTS } from '../../data/events';
import { getScenario, SCENARIOS } from '../../data/scenarios';
import { TERMS } from '../../data/terms';
import { SCOURGES, TERRAINS } from '../../data/world';
import type { GameCommand, GameState, LaneDef, PlayerId, ScenarioMapDef } from '../../types';
import { applyGameCommand, createGame } from '../index';
import { applyClimate, climateAt } from '../game/world/climate';
import { HERB_EVENT, herbEventOf } from '../game/world/generate';
import { heroMaxHp } from '../game/hero';
import { isWideMap, laneOfTile } from '../game/world/lanes';
import { aliveScourges, scourgeLanes, scourgesFor, scourgeText } from '../game/world/scourges';

const CK = 'corruptionKing';
const FK = 'frozenKingdom';

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
function newGame(scenarioId: string, seed: number, players: PlayerId[] = ['P1', 'P2'], classes = ['thief', 'priest', 'mage', 'warrior']) {
  let g = createGame({ seed, scenarioId, difficulty: 'normal', party: players.map((playerId, i) => ({ classId: classes[i], gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  return g;
}
/** ワールドターンを1つ終える（全員が待機。物語の窓が出ていたら閉じる） */
function endTurn(g: GameState): GameState {
  const start = g.world!.worldTurn;
  for (let k = 0; k < 10 && g.world!.worldTurn === start && g.mode === 'world'; k++) {
    if (g.world!.story) g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const h = g.heroes.find((x) => x.id === g.world!.turn)!;
    g = run(g, { type: 'WORLD_WAIT', playerId: h.playerId, heroId: h.id });
  }
  return g;
}
/** 32bit の FNV-1a（状態の指紋） */
function fp(text: string): string {
  let a = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) a = Math.imul(a ^ text.charCodeAt(i), 0x01000193);
  return (a >>> 0).toString(16).padStart(8, '0');
}
/** 節目を越えて災厄を3体出す（鍵 → 40% → 60%）。物語の窓の文と、冒険の状態全部（乱数・記録も）の指紋を返す */
function scourgeRun(seed: number, classes?: string[]) {
  let g = newGame(CK, seed, ['P1', 'P2'], classes);
  const texts: string[] = [];
  const grab = () => {
    if (g.world!.story) texts.push(g.world!.story.title, ...g.world!.story.lines);
  };
  g.world!.keys = ['k1'];
  g = endTurn(g);
  grab();
  g.world!.corruption = 40;
  g = endTurn(g);
  grab();
  g.world!.corruption = 60;
  g = endTurn(g);
  grab();
  g = endTurn(g);
  grab();
  return { g, kinds: aliveScourges(g.world).map((x) => `${x.def.id}@${x.wd.tile}`), texts, state: fp(JSON.stringify(g)) };
}

/** 作り直しの前（eaae598）のコードで取った値。種類@マスと、冒険の状態の指紋（死霊術師の入る種は、物語の窓の文の指紋も） */
const BEFORE: Record<number, { kinds: string[]; state: string }> = {
  1: { kinds: ['greedKing@629', 'infernoDemon@521', 'stormWitch@627'], state: 'f52ef712' },
  2: { kinds: ['stormWitch@469', 'infernoDemon@615', 'greedKing@551'], state: '1af6030c' },
  3: { kinds: ['stormWitch@584', 'nightmareBeast@629', 'greedKing@554'], state: 'abe1010a' },
  4: { kinds: ['infernoDemon@600', 'nightmareBeast@628', 'greedKing@602'], state: '8e6f820a' },
  5: { kinds: ['greedKing@497', 'infernoDemon@521', 'nightmareBeast@583'], state: 'a786e9b4' },
  6: { kinds: ['nightmareBeast@499', 'stormWitch@476', 'infernoDemon@537'], state: 'd0e5f799' },
  7: { kinds: ['stormWitch@522', 'nightmareBeast@491', 'greedKing@614'], state: '4c6d43a0' },
  8: { kinds: ['greedKing@522', 'nightmareBeast@482', 'stormWitch@554'], state: 'f5266b62' },
  9: { kinds: ['stormWitch@476', 'nightmareBeast@554', 'greedKing@498'], state: 'f3bb18df' },
  10: { kinds: ['stormWitch@615', 'nightmareBeast@467', 'greedKing@498'], state: 'acc3f3a8' },
  21: { kinds: ['stormWitch@498', 'greedKing@585', 'miasmaNecro@569'], state: 'a420500f:2c8efb12' },
  22: { kinds: ['greedKing@554', 'nightmareBeast@614', 'stormWitch@499'], state: 'b247a764:151d6a81' },
  23: { kinds: ['greedKing@467', 'miasmaNecro@584', 'nightmareBeast@468'], state: 'c63593f7:bd13c8e8' },
  24: { kinds: ['infernoDemon@599', 'stormWitch@538', 'greedKing@536'], state: 'd193f14e:4fe36bb7' },
  25: { kinds: ['stormWitch@468', 'greedKing@496', 'nightmareBeast@599'], state: 'd432a9ad:1b66d5aa' },
};
/**
 * 作り直しの前のコードで取った、7本の新しい冒険（種1〜3・2人）の状態の指紋。地図の生成と乱数の順番が変わっていない事。
 * シナリオ2だけは、区切り2で地図を 15×42 に作り直したので、区切り2の地図で取り直した（前の 8×35 は 8695f871・b725699b・b35b9ce7）。
 * 2026-11-14 B組の区切り2: シナリオ2だけのテーマ「氷漬けの宝物庫」を足し、シナリオ2はテーマを4つから選ぶ（混ぜる乱数が1回増える）ので取り直した
 * （前は 18abebb9・5a847cfb・d7dec7f1）。ほかの6本は前のまま
 */
const BEFORE_MAPS: Record<string, string[]> = {
  corruptionKing: ['26c62f2f', 'e61644da', 'b4f77cef'],
  frozenKingdom: ['75fe636c', 'a2511bd2', 'd070f8a1'],
  cursedArchipelago: ['c475394c', 'f650664b', 'a54306f8'],
  sandDynasty: ['bb9a8be6', '93b10c4a', 'd723aecd'],
  starCastle: ['3636fe91', 'd44fae16', 'f00ba5cb'],
  clockworkEmpire: ['786d6478', '1084b75f', '2cf54543'],
  dreamLabyrinth: ['1721769d', '7e043d9f', '6c345253'],
};

describe('区切り1: シナリオ1・ほかの6本の動きは今までと同じ', () => {
  it('7本 × 種3個: 新しい冒険の状態（地図・敵・乱数）が、作り直しの前と同じ', () => {
    for (const s of SCENARIOS.all) {
      const got = [1, 2, 3].map((seed) =>
        fp(JSON.stringify(createGame({ seed, scenarioId: s.id, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }, { classId: 'priest', gender: 'male', name: 'b', playerId: 'P2' }] }))),
      );
      expect(got, s.id).toEqual(BEFORE_MAPS[s.id]);
    }
  });

  it('シナリオ1・種15個: 同じ種類の災厄が同じマスに出て、冒険の状態（乱数・物語・記録）と文も前と同じ', () => {
    for (const seed of Object.keys(BEFORE).map(Number)) {
      const necro = seed > 20;
      const r = scourgeRun(seed, necro ? ['necromancer', 'thief'] : undefined);
      expect(r.kinds, `seed ${seed}`).toEqual(BEFORE[seed].kinds);
      expect(necro ? `${r.state}:${fp(r.texts.join('|'))}` : r.state, `seed ${seed}`).toBe(BEFORE[seed].state);
    }
  }, 120000);
});

// ---------- 帯の寒さの倍率 ----------

describe('区切り1: 帯の寒さ・暑さの倍率（LaneDef.climate）', () => {
  const lanes = getScenario(CK).map!.lanes!;
  afterEach(() => {
    for (const l of lanes) delete (l as LaneDef).climate;
  });
  /** 帯の中の、施設の無いマス */
  const tileIn = (g: GameState, lane: string) => g.world!.tiles.findIndex((t, i) => !t.f && laneOfTile(g, g.world!, i) === lane);

  it('広い地図: 寒いマスの割合に帯の倍率を掛ける。0 なら寒さ無し・省略は今までどおり（地形の寒さのまま）', () => {
    const by = Object.fromEntries(lanes.map((l) => [l.id, l]));
    by.west.climate = 2;
    by.center.climate = 0;
    const g = newGame(CK, 3);
    const w = g.world!;
    expect(isWideMap(g, w)).toBe(true);
    const [west, center, east] = ['west', 'center', 'east'].map((id) => tileIn(g, id));
    for (const i of [west, center, east]) w.tiles[i].t = 'snow';
    expect(climateAt(g, west)).toEqual({ kind: 'cold', ratio: BALANCE.climateDamageRatio * 2 });
    expect(climateAt(g, center)).toBeUndefined();
    expect(climateAt(g, east)).toEqual(TERRAINS.get('snow').climate);
    // 寒さの無いマスには、倍率があっても何も起きない
    w.tiles[west].t = 'plains';
    expect(climateAt(g, west)).toBeUndefined();
  });

  it('ワールドターンの終わり: 倍率の掛かった分だけHPが減る（HPは1で止まる・野営した人は受けない。今までの決まりのまま）', () => {
    lanes[0].climate = 2;
    const g = newGame(CK, 4);
    const w = g.world!;
    const i = tileIn(g, lanes[0].id);
    w.tiles[i].t = 'snow';
    const h = g.heroes[0];
    w.pos[h.id] = i;
    w.pos[g.heroes[1].id] = i;
    w.sheltered = [g.heroes[1].id];
    h.hp = heroMaxHp(h);
    const hp2 = g.heroes[1].hp;
    applyClimate(g);
    expect(heroMaxHp(h) - h.hp).toBe(Math.ceil(heroMaxHp(h) * BALANCE.climateDamageRatio * 2));
    expect(g.heroes[1].hp).toBe(hp2);
  });

  // 「帯の無い地図（前のシナリオ2の 8×35）は今までどおり」は、区切り2でシナリオ2の地図が広い地図になったので、
  // 古い保存のテスト（scenario2OldSave.test.ts の「寒さは前の決まりのまま」）で確かめる
  it('シナリオ2（区切り2から広い地図）: 帯の倍率は西 ×2・中央 ×0.5・東は省略（×1）', () => {
    const g = newGame(FK, 5);
    expect(isWideMap(g, g.world!)).toBe(true);
    expect(getScenario(FK).map!.lanes!.map((l) => l.climate)).toEqual([2, 0.5, undefined]);
  });
});

// ---------- 湖の氷 ----------

describe('区切り1: 新しい地形「湖の氷」（lakeIce）', () => {
  it('移動力1・寒い・海でない・移動 +2（区切り2。オーナーの決定 §8-1 の3）。氷原（移動力2）・街道（寒さ無しで +1）と違う', () => {
    const t = TERRAINS.get('lakeIce');
    expect(t.name).toBe('湖の氷');
    expect(t.moveCost).toBe(1);
    expect(t.climate?.kind).toBe('cold');
    expect(t.sea).toBeFalsy();
    expect(t.moveDiceBonus).toBe(2);
    expect(TERRAINS.get('road').moveDiceBonus).toBe(1);
    expect(TERRAINS.get('ice').moveCost).toBe(2);
    expect(TERRAINS.get('road').climate).toBeUndefined();
    // 地形の並び（order）がほかと重ならない
    const orders = TERRAINS.all.map((x) => x.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('使うのはシナリオ2の地図だけ（区切り2から）', () => {
    for (const s of SCENARIOS.all) {
      if (s.id === FK) expect(s.map!.regions.some((r) => r.terrain.lakeIce), s.id).toBe(true);
      else for (const r of s.map?.regions ?? []) expect(r.terrain.lakeIce, `${s.id}/${r.id}`).toBeUndefined();
    }
  });
});

// ---------- 回復のマスのイベント ----------

describe('区切り1: 薬草の群生地のイベントを地図で選ぶ（ScenarioMapDef.herbEvent）', () => {
  const map = getScenario(CK).map as ScenarioMapDef;
  afterEach(() => {
    delete map.herbEvent;
  });
  const herbsInData = () => map.regions.reduce((n, r) => n + (r.herbs ?? 0), 0);
  const count = (g: GameState, id: string) => g.world!.tiles.filter((t) => t.f?.kind === 'event' && t.f.id === id).length;

  it('省略は薬草の群生地（今までどおり）', () => {
    expect(herbEventOf(map)).toBe(HERB_EVENT);
    expect(herbEventOf(undefined)).toBe(HERB_EVENT);
    expect(count(newGame(CK, 7), HERB_EVENT)).toBe(herbsInData());
  });

  it('別のイベントを書くと、地域の herbs の数だけそのイベントを置く（薬草の群生地は置かない）。無い id なら何も置かない', () => {
    // 置く物のイベント（placed）の代わりに、地図に出るほかのイベントを1つ借りる（ふつうのくじにも入る物なので、herbs の数以上）
    const other = EVENTS.forScenario(CK).find((e) => e.where === 'map' && !e.placed && e.id !== HERB_EVENT)!;
    map.herbEvent = other.id;
    expect(herbEventOf(map)).toBe(other.id);
    const g = newGame(CK, 7);
    expect(count(g, HERB_EVENT)).toBe(0);
    expect(count(g, other.id)).toBeGreaterThanOrEqual(herbsInData());
    map.herbEvent = 'noSuchEvent';
    const g2 = newGame(CK, 7);
    expect(count(g2, HERB_EVENT) + count(g2, 'noSuchEvent')).toBe(0);
  });
});

// ---------- 災厄 ----------

describe('区切り1: 災厄の置き場（街道の帯でない帯）', () => {
  it('シナリオ1は西と東（中央の街道の帯を除く）', () => {
    expect([...scourgeLanes(getScenario(CK).map)].sort()).toEqual(['east', 'west']);
  });

  it('街道の骨格の点が通る帯を除く。骨格が無ければ全部の帯・帯が無ければ空', () => {
    const lanes: LaneDef[] = [
      { id: 'lake', name: '湖', cols: [0, 4], terrain: {} },
      { id: 'road', name: '街道', cols: [5, 9], terrain: {} },
      { id: 'ridge', name: '尾根', cols: [10, 14], terrain: {} },
    ];
    expect([...scourgeLanes({ lanes, highway: [[7, 40], [6, 20], [2, 0]] })].sort()).toEqual(['ridge']);
    expect([...scourgeLanes({ lanes, highway: [[12, 40], [11, 0]] })].sort()).toEqual(['lake', 'road']);
    expect([...scourgeLanes({ lanes })].sort()).toEqual(['lake', 'ridge', 'road']);
    expect(scourgeLanes({ highway: [[1, 1]] }).size).toBe(0);
    // シナリオ2（区切り2から広い地図）: 街道は中央の「薪の街道」なので、西と東
    expect([...scourgeLanes(getScenario(FK).map)].sort()).toEqual(['east', 'west']);
  });
});

describe('区切り1: シナリオに出る災厄の一覧（ScenarioMapDef.scourges）', () => {
  it('区切り3b: シナリオ1の地図は今の5体を今の順で書く。シナリオ2は氷嵐の魔女と3体。一覧の無い地図は、共通とそのシナリオだけの災厄', () => {
    expect(getScenario(CK).map!.scourges).toEqual(['greedKing', 'miasmaNecro', 'nightmareBeast', 'stormWitch', 'infernoDemon']);
    expect(scourgesFor(CK).map((d) => d.id)).toEqual(['greedKing', 'miasmaNecro', 'nightmareBeast', 'stormWitch', 'infernoDemon']);
    expect(getScenario(FK).map!.scourges).toEqual(['stormWitch', 'whiteWolfKing', 'frostBellWraith', 'lampEaterShade']);
    expect(scourgesFor(FK).map((d) => d.id)).toEqual(['stormWitch', 'whiteWolfKing', 'frostBellWraith', 'lampEaterShade']);
    // 一覧を消すと: シナリオ1 = 共通の5体だけ（シナリオ2の3体は出ない）／シナリオ2 = 共通の5体とシナリオ2の3体
    const ck = getScenario(CK).map as ScenarioMapDef;
    const fk = getScenario(FK).map as ScenarioMapDef;
    const [keepCk, keepFk] = [ck.scourges, fk.scourges];
    try {
      delete ck.scourges;
      delete fk.scourges;
      expect(scourgesFor(CK).map((d) => d.id)).toEqual(['greedKing', 'miasmaNecro', 'nightmareBeast', 'stormWitch', 'infernoDemon']);
      expect(scourgesFor(FK).map((d) => d.id)).toEqual(['greedKing', 'miasmaNecro', 'nightmareBeast', 'stormWitch', 'infernoDemon', 'whiteWolfKing', 'frostBellWraith', 'lampEaterShade']);
      expect(scourgesFor('sandDynasty').map((d) => d.id)).toEqual(['greedKing', 'miasmaNecro', 'nightmareBeast', 'stormWitch', 'infernoDemon']);
    } finally {
      ck.scourges = keepCk;
      fk.scourges = keepFk;
    }
  });

  it('一覧の順に関係なく、選ぶ候補は SCOURGES.all の順（乱数の順番が一覧の書き方で変わらない）', () => {
    const map = getScenario(CK).map as ScenarioMapDef;
    const keep = map.scourges;
    try {
      map.scourges = ['infernoDemon', 'greedKing'];
      expect(scourgesFor(CK).map((d) => d.id)).toEqual(['greedKing', 'infernoDemon']);
    } finally {
      map.scourges = keep;
    }
  });

  it('地図の一覧に書いた id は、全部ある災厄', () => {
    for (const s of SCENARIOS.all) for (const id of s.map?.scourges ?? []) expect(SCOURGES.has(id), `${s.id}: ${id}`).toBe(true);
  });

  // 「8×35 のシナリオ2には災厄は出ない」は、区切り2で地図が広い地図になったので、古い保存のテスト（scenario2OldSave.test.ts）で確かめる。
  // 新しい地図で魔女だけが出る事は scenario2Map.test.ts
  it('シナリオ2（区切り2から広い地図）: 新しい冒険は災厄の数え始め（まだ0体）', () => {
    const g = newGame(FK, 5);
    expect(g.world!.scourgeCount).toBe(0);
    expect(aliveScourges(g.world)).toHaveLength(0);
  });
});

describe('区切り1: 災厄の文の「侵食度」を、シナリオの悪化の名前で出す', () => {
  it('シナリオ1は全部の文が今のまま', () => {
    const g = { scenarioId: CK };
    for (const d of SCOURGES.all)
      for (const text of [d.curseShort, d.curseText, d.appearText, d.clearText]) expect(scourgeText(g, text)).toBe(text);
  });

  it('シナリオ2は「冬の深さ」になる（札の短い「侵食」も）。侵食に関係の無い文は変わらない', () => {
    const g = { scenarioId: FK };
    const necro = SCOURGES.get('miasmaNecro');
    expect(scourgeText(g, necro.curseText)).toBe('世界マップの番ごとに、冬の深さがさらに0.5%上がる（ダンジョンの中の番には掛からない）');
    expect(scourgeText(g, necro.curseShort)).toBe('冬の深さ+0.5%');
    const witch = SCOURGES.get('stormWitch');
    for (const text of [witch.curseShort, witch.curseText, witch.appearText, witch.clearText]) expect(scourgeText(g, text)).toBe(text);
    for (const d of SCOURGES.all) expect(scourgeText(g, d.curseText)).not.toContain(TERMS.corruption);
  });
});
