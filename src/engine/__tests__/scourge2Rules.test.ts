// ===== シナリオ2の作り直し 区切り3a: 新しい災厄3体の「悪さ」「加護」「専用の装備」の仕組み =====
// 区切り3b で3体を登録した（frozenKingdom/scourges/）。このテストは悪さ・加護・専用の装備の決まりを見る（敵・段階は scourge3b.test.ts）。
// 悪さ3つ（寒さ×2・街道が雪に埋もれる・視界−1）／加護3つ（白い息・鐘の響き・闇の帳）: 効く・倒すと戻る・防ぐ手が効く・1人と複数・保存して再開
// 専用の装備: 登録されて一覧に入るまでは今までどおり／広い地図だけ災厄だけが落とす／古い 8×35 では今までどおり
import { afterEach, describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { getEnemy, getEnemyAction } from '../../data/enemies';
import { getItem, ITEMS } from '../../data/items';
import { getScenario } from '../../data/scenarios';
import { SCOURGES, TERRAINS } from '../../data/world';
import type { BattleState, Command, GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, buildDungeon, createGame, createRng, incomingDamage, startBattleWith } from '../index';
import { bellHitsOn } from '../battle/intents';
import { bellLeft, bellNow, bellStrikes, veiledIntent } from '../battle/boons';
import { cleverBattleCommand } from '../botClever';
import { applyClimate, climateAt } from '../game/world/climate';
import { activeBoons, battleBoonViews, bigEnemyOf, boonViews, dungeonDetourLines } from '../game/world/detour';
import { visionOf } from '../game/world/fog';
import { isWideMap, roadBuriedNote, terrainDiceBonus } from '../game/world/lanes';
import { heldByScourge, scourgeHeldGear } from '../game/world/scourgeGear';
import { scourgeCurse } from '../game/world/scourgeCurse';
import { rollEquipment } from '../game/loot';
import { timeOfDay } from '../game/world/time';
import { intentView } from '../../components/format';

// ---------- シナリオ2の災厄3体（区切り3b で登録） ----------
const IDS = ['whiteWolfKing', 'frostBellWraith', 'lampEaterShade'];
const frozenScourgeDrafts = IDS.map((id) => SCOURGES.get(id));

const eventIds = EVENTS.forScenario('corruptionKing').filter((e) => e.where !== 'map' && e.where !== 'spawn').map((e) => e.id);
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
function newGame(scenarioId = 'corruptionKing', players: PlayerId[] = ['P1'], classes = ['warrior', 'priest', 'thief', 'mage'], seed = 5) {
  let g = createGame({ seed, scenarioId, difficulty: 'normal', party: players.map((playerId, i) => ({ classId: classes[i], gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  return g;
}
/** 地図に災厄を置く（悪さ・加護を確かめる用。場所はどこでも良い = 空いた陸のマス） */
function withScourges(g: GameState, ids: string[]): GameState {
  const t = structuredClone(g);
  const w = t.world!;
  for (const id of ids) {
    const tile = w.tiles.findIndex((x, i) => !x.f && TERRAINS.get(x.t).moveCost > 0 && !Object.values(w.pos).includes(i) && !w.wanderers.some((y) => y.tile === i));
    w.wanderers.push({ id: `w${w.nextWandererId++}`, tile, enemies: [{ defId: SCOURGES.get(id).boss, level: 5 }], scourge: id });
  }
  return t;
}
const without = (g: GameState, id: string): GameState => {
  const t = structuredClone(g);
  t.world!.wanderers = t.world!.wanderers.filter((x) => x.scourge !== id);
  return t;
};
/** 鍵のダンジョンのボス（中ボス）の部屋の戦闘を、そのまま始める */
function bossBattle(g: GameState, roomType = 'boss', opts: { surprise?: boolean } = {}): GameState {
  const t = structuredClone(g);
  // 中ボスの部屋は魔王城（翠の神殿には中ボスがいない）
  const id = roomType === 'midboss' ? 'demonCastle' : 'emeraldTemple';
  t.dungeon = buildDungeon(id, createRng(7), 0, eventIds);
  t.party = t.heroes.map((h) => h.id);
  const def = DUNGEONS.get(id);
  const ids = roomType === 'midboss' ? def.pools.midboss! : def.pools.boss;
  startBattleWith(t, ids.map((defId) => ({ defId, level: def.baseLevel + 2 })), roomType, createRng(11), opts);
  return t;
}
const battleCmd = (g: GameState, command: Command): GameState => run(g, { type: 'BATTLE', command });
/** 味方は何もせずに番を終え、敵の番を最後まで進める */
function passTurn(g: GameState): GameState {
  // オンラインでなければ、だれか1人の「番を終える」で味方の番が終わる
  for (const p of new Set(g.battle!.allies.filter((a) => !a.dead).map((a) => a.playerId))) if (g.battle!.phase === 'ally') g = battleCmd(g, { type: 'END_TURN', playerId: p });
  for (let k = 0; k < 20 && g.battle?.phase === 'enemy'; k++) g = battleCmd(g, { type: 'ENEMY_STEP' });
  return g;
}
const equip = (g: GameState, slot: 'accessory' | 'armor', itemId: string) => {
  const t = structuredClone(g);
  t.heroes.forEach((h, i) => (h.equipment[slot] = { uid: `eq${i}`, itemId }));
  return t;
};
const json = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// ---------- データ（案の文） ----------

describe('区切り3a: 3体の案のデータ', () => {
  it('悪さ・加護は、今の5体とも3体どうしでも別の種類。専用の装備はシナリオ2の伝説品で、災厄だけが落とす印が付いている', () => {
    const old = SCOURGES.all.filter((d) => !IDS.includes(d.id));
    const oldCurse = new Set(old.flatMap((d) => Object.keys(d.curse)));
    const oldBoon = new Set(old.map((d) => d.boon.kind));
    expect(frozenScourgeDrafts.map((d) => d.id)).toEqual(IDS);
    expect(frozenScourgeDrafts.map((d) => Object.keys(d.curse))).toEqual([['coldMul'], ['buryRoad'], ['visionDown']]);
    expect(frozenScourgeDrafts.map((d) => d.boon.kind)).toEqual(['frostBreath', 'bellToll', 'darkVeil']);
    for (const d of frozenScourgeDrafts) {
      for (const k of Object.keys(d.curse)) expect(oldCurse.has(k), k).toBe(false);
      expect(oldBoon.has(d.boon.kind)).toBe(false);
      const it = getItem(d.gear);
      expect(it.rarity).toBe('legend');
      expect(it.scenario).toBe('frozenKingdom');
      expect(it.scourgeGear).toBe(d.id);
      expect(d.curseShort.length).toBeLessThanOrEqual(6);
    }
    expect(frozenScourgeDrafts.map((d) => d.gear)).toEqual(['springWaitCloak', 'everIceBracer', 'springbringerScepter']);
    // 数字は案のまま（寒さ×2・3ターンごと・半分・凍結1／1人は弱体1）
    expect(frozenScourgeDrafts[0].curse.coldMul).toBe(2);
    expect(frozenScourgeDrafts[0].boon).toMatchObject({ status: 'freeze', soloStatus: 'weak', amount: 1 });
    expect(frozenScourgeDrafts[1].boon).toMatchObject({ every: 3, pct: 50 });
    expect(frozenScourgeDrafts[2].boon).toMatchObject({ seeItems: ['lampLantern'] });
  });

  it('シナリオ2の地図の災厄の一覧は、氷嵐の魔女と3体（区切り3b）。シナリオ1は今の5体のまま', () => {
    expect(getScenario('frozenKingdom').map!.scourges).toEqual(['stormWitch', ...IDS]);
    expect(getScenario('corruptionKing').map!.scourges).toEqual(['greedKing', 'miasmaNecro', 'nightmareBeast', 'stormWitch', 'infernoDemon']);
  });
});

// ---------- 悪さ ----------

describe('悪さ: 白狼王（寒さのダメージ ×2）', () => {
  it('寒さの割合が2倍（帯の倍率と掛け算）。HPの減りも2倍。倒すと元に戻る', () => {
    const g = newGame('frozenKingdom');
    const w = g.world!;
    expect(isWideMap(g, w)).toBe(true);
    const tile = w.tiles.findIndex((t, i) => t.f === undefined && climateAt(g, i)?.kind === 'cold');
    expect(tile).toBeGreaterThanOrEqual(0);
    const base = climateAt(g, tile)!.ratio ?? BALANCE.climateDamageRatio;
    const wolf = withScourges(g, ['whiteWolfKing']);
    expect(scourgeCurse(wolf).coldMul).toBe(2);
    expect(climateAt(wolf, tile)!.ratio).toBeCloseTo(base * 2, 10);
    expect(climateAt(without(wolf, 'whiteWolfKing'), tile)!.ratio ?? BALANCE.climateDamageRatio).toBeCloseTo(base, 10);
    // HPの減り（ワールドターンの終わり）
    const lose = (s: GameState) => {
      const t = structuredClone(s);
      const h = t.heroes[0];
      t.world!.pos[h.id] = tile;
      const before = h.hp;
      applyClimate(t);
      return before - t.heroes[0].hp;
    };
    const max = g.heroes[0].hp;
    expect(lose(g)).toBe(Math.max(1, Math.ceil(max * base)));
    expect(lose(wolf)).toBe(Math.max(1, Math.ceil(max * base * 2)));
  });

  it('野営・温泉で防げるのは今のまま。HPは1で止まる', () => {
    const g = withScourges(newGame('frozenKingdom'), ['whiteWolfKing']);
    const w = g.world!;
    const tile = w.tiles.findIndex((t, i) => t.f === undefined && climateAt(g, i)?.kind === 'cold');
    const h = g.heroes[0];
    w.pos[h.id] = tile;
    const camp = structuredClone(g);
    camp.world!.sheltered = [h.id];
    applyClimate(camp);
    expect(camp.heroes[0].hp).toBe(h.hp);
    const spring = structuredClone(g);
    spring.world!.warm = { [h.id]: spring.world!.worldTurn };
    applyClimate(spring);
    expect(spring.heroes[0].hp).toBe(h.hp);
    const low = structuredClone(g);
    low.heroes[0].hp = 2;
    applyClimate(low);
    expect(low.heroes[0].hp).toBe(1);
    applyClimate(low);
    expect(low.heroes[0].hp).toBe(1);
  });

  it('寒さの無いマス（町）は寒さが無いまま（暑さ・寒さの無い所には掛からない）', () => {
    const g = withScourges(newGame('frozenKingdom'), ['whiteWolfKing']);
    const town = g.world!.tiles.findIndex((t) => t.f?.kind === 'town');
    expect(climateAt(g, town)).toBeUndefined();
  });
});

describe('悪さ: 凍て鐘の亡霊（街道が雪に埋もれる）', () => {
  it('街道の +1 だけが無くなる。湖の氷の +2 は残る。サイコロの画面の文がエンジンから出る。倒すと戻る', () => {
    const g = newGame('frozenKingdom');
    const w = g.world!;
    const road = w.tiles.findIndex((t) => t.t === 'road' && !t.f);
    const ice = w.tiles.findIndex((t) => t.t === 'lakeIce' && !t.f);
    expect(road).toBeGreaterThanOrEqual(0);
    expect(ice).toBeGreaterThanOrEqual(0);
    expect(terrainDiceBonus(g, w, road)).toEqual([{ label: '街道', value: 1 }]);
    const bell = withScourges(g, ['frostBellWraith']);
    expect(terrainDiceBonus(bell, bell.world!, road)).toEqual([]);
    expect(terrainDiceBonus(bell, bell.world!, ice)).toEqual([{ label: '湖の氷', value: 2 }]);
    expect(roadBuriedNote(bell, bell.world!, road)).toBe('❄ 街道が雪に埋もれている（凍て鐘の亡霊のせいで、街道ボーナス +1 が無い）');
    expect(roadBuriedNote(bell, bell.world!, ice)).toBeUndefined();
    expect(roadBuriedNote(g, w, road)).toBeUndefined();
    const back = without(bell, 'frostBellWraith');
    expect(terrainDiceBonus(back, back.world!, road)).toEqual([{ label: '街道', value: 1 }]);
  });

  it('サイコロを振った時の移動力も、埋もれた街道では +1 が付かない（同じ種で比べる）', () => {
    const g = newGame('frozenKingdom');
    const road = g.world!.tiles.findIndex((t) => t.t === 'road' && !t.f);
    const roll = (s: GameState) => {
      const t = structuredClone(s);
      const h = t.heroes.find((x) => x.id === t.world!.turn)!;
      t.world!.pos[h.id] = road;
      t.world!.prevTile = road;
      return run(t, { type: 'WORLD_ROLL_MOVE', playerId: h.playerId, heroId: h.id }).world!.move!;
    };
    expect(roll(g) - roll(withScourges(g, ['frostBellWraith']))).toBe(1);
  });
});

describe('悪さ: 灯を喰らう影（昼も夜も視界 −1・最低1マス）', () => {
  it('昼は1マス狭く、夜も1マス狭く（最低1マス）。倒すと戻る', () => {
    const g = newGame('frozenKingdom');
    const id = g.heroes[0].id;
    const day = structuredClone(g);
    day.world!.worldTurn = [1, 2, 3, 4, 5, 6, 7, 8].find((n) => timeOfDay(n) === 'noon')!;
    const night = structuredClone(g);
    night.world!.worldTurn = Array.from({ length: 40 }, (_, i) => i + 1).find((n) => timeOfDay(n) === 'night')!;
    for (const s of [day, night]) {
      const before = visionOf(s, s.world!, id);
      const shade = withScourges(s, ['lampEaterShade']);
      expect(visionOf(shade, shade.world!, id)).toBe(Math.max(1, before - 1));
      const back = without(shade, 'lampEaterShade');
      expect(visionOf(back, back.world!, id)).toBe(before);
    }
    expect(visionOf(day, day.world!, id)).toBe(BALANCE.visionRange);
    const shadeDay = withScourges(day, ['lampEaterShade']);
    expect(visionOf(shadeDay, shadeDay.world!, id)).toBe(BALANCE.visionRange - 1);
  });

  it('3体の悪さは足し合わせても、ほかの悪さを変えない（店・野営・夜の敵・火傷は今のまま）', () => {
    const g = withScourges(newGame('frozenKingdom'), IDS);
    expect(scourgeCurse(g)).toEqual({ shopPrice: 0, corruptionPerTurn: 0, campHeal: 1, nightLevel: 0, battleBurn: 0, coldMul: 2, buryRoad: true, visionDown: 1 });
  });
});

// ---------- 加護 ----------

describe('加護の一覧（今の5体と同じ形）', () => {
  it('生きている災厄の加護が、名前と文で出る。地図のダンジョンの説明に闇の帳の見る方法が出る', () => {
    const g = withScourges(newGame(), IDS);
    expect(boonViews(g).map((b) => b.name)).toEqual(['白い息', '鐘の響き', '闇の帳']);
    expect(activeBoons(g.world).map((d) => d.id)).toEqual(IDS);
    const tile = g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'emeraldTemple');
    const lines = dungeonDetourLines(g, tile);
    expect(lines[0]).toBe('💀加護: 「白い息」「鐘の響き」「闇の帳」（ボス・中ボスの戦闘に掛かる）');
    expect(lines[1]).toContain('💀闇の帳: ボス・中ボスの最初の予告は、名前と数字が見えない');
    const b = bossBattle(g).battle!;
    expect(battleBoonViews(b).map((x) => x.name)).toEqual(['白い息', '鐘の響き', '闇の帳']);
  });
});

describe('加護: 白い息（白狼王）', () => {
  const statusesOf = (b: BattleState) => b.allies.map((a) => [a.statuses.freeze ?? 0, a.statuses.weak ?? 0]);

  it('2人以上: 戦闘の始めに、味方1人だけが「凍結」1。同じ種なら同じ相手。保存して再開しても同じ', () => {
    const g = withScourges(newGame('corruptionKing', ['P1', 'P2']), ['whiteWolfKing']);
    const b = bossBattle(g).battle!;
    const st = statusesOf(b);
    expect(st.filter(([f]) => f === 1)).toHaveLength(1);
    expect(st.every(([, w]) => w === 0)).toBe(true);
    expect(statusesOf(bossBattle(json(g)).battle!)).toEqual(st);
    expect(b.log.some((l) => l.text.includes('💀白い息:'))).toBe(true);
    // 中ボスの戦闘にも掛かる
    expect(statusesOf(bossBattle(g, 'midboss').battle!).filter(([f]) => f === 1)).toHaveLength(1);
  });

  it('凍結は2ターン目のマナ −1（1ターン目のマナは減らない）', () => {
    const g = withScourges(newGame('corruptionKing', ['P1', 'P2']), ['whiteWolfKing']);
    let s = bossBattle(g);
    const i = s.battle!.allies.findIndex((a) => (a.statuses.freeze ?? 0) > 0);
    expect(s.battle!.allies[i].mana).toBe(BALANCE.manaPerTurn);
    s = passTurn(s);
    if (s.battle!.allies[i].dead) return;
    expect(s.battle!.allies[i].mana).toBe(BALANCE.manaPerTurn - 1);
  });

  it('1人で遊ぶ時（戦闘に出る味方が1人）は、凍結の代わりに「弱体」1', () => {
    const g = withScourges(newGame('corruptionKing', ['P1'], ['warrior']), ['whiteWolfKing']);
    const b = bossBattle(g).battle!;
    expect(b.allies).toHaveLength(1);
    expect(statusesOf(b)).toEqual([[0, 1]]);
  });

  it('灯火のランタンで防げる（凍結も弱体も）。雪解けの指輪は凍結を2ターン目のマナが減る前に治す', () => {
    const two = withScourges(newGame('corruptionKing', ['P1', 'P2']), ['whiteWolfKing']);
    const one = withScourges(newGame('corruptionKing', ['P1'], ['warrior']), ['whiteWolfKing']);
    expect(statusesOf(bossBattle(equip(two, 'accessory', 'lampLantern')).battle!).flat().every((n) => n === 0)).toBe(true);
    expect(statusesOf(bossBattle(equip(one, 'accessory', 'lampLantern')).battle!)).toEqual([[0, 0]]);
    // 春待ちの外套（白狼王が落とす品）も凍結を防ぐ（今の「状態異常を防ぐ」通り道を通っている）
    expect(statusesOf(bossBattle(equip(two, 'armor', 'springWaitCloak')).battle!).flat().every((n) => n === 0)).toBe(true);
    let s = bossBattle(equip(two, 'accessory', 'thawRing'));
    const i = s.battle!.allies.findIndex((a) => (a.statuses.freeze ?? 0) > 0);
    expect(i).toBeGreaterThanOrEqual(0);
    s = passTurn(s);
    if (s.battle!.allies[i].dead) return;
    expect(s.battle!.allies[i].statuses.freeze ?? 0).toBe(0);
    expect(s.battle!.allies[i].mana).toBe(BALANCE.manaPerTurn);
  });

  it('倒すと掛からない。ランダムダンジョン・ふつうの戦闘には掛からない', () => {
    const g = withScourges(newGame('corruptionKing', ['P1', 'P2']), ['whiteWolfKing']);
    expect(statusesOf(bossBattle(without(g, 'whiteWolfKing')).battle!).flat().every((n) => n === 0)).toBe(true);
    expect(bossBattle(without(g, 'whiteWolfKing')).battle!.boon).toBeUndefined();
    expect(statusesOf(bossBattle(g, 'battle').battle!).flat().every((n) => n === 0)).toBe(true);
  });
});

describe('加護: 鐘の響き（凍て鐘の亡霊）', () => {
  /** 大物だけを残し、大物の予告を「target を狙う単体攻撃」にして、ターンを決める */
  function setup(players: PlayerId[], turn: number): { g: GameState; target: string } {
    const g0 = withScourges(newGame('corruptionKing', players), ['frostBellWraith']);
    const g = bossBattle(g0);
    const b = g.battle!;
    const big = bigEnemyOf(b)!;
    for (const e of b.enemies) if (e !== big) (e.dead = true), (e.hp = 0), (e.intent = undefined);
    const def = getEnemy(big.defId);
    const act = [...def.actions, ...(def.phases ?? []).flatMap((p) => p.actions)].find((a) => a.effects.some((e) => e.kind === 'damage' && (e.to ?? 'target') === 'target' && !('lowOnly' in e && e.lowOnly)) && !a.effects.some((e) => e.kind === 'damage' && e.to === 'foes'))!;
    expect(act).toBeDefined();
    big.intent = { actionId: act.id, targetId: b.allies[0].id };
    b.turn = turn;
    for (const a of b.allies) (a.block = 0), (a.hp = a.maxHp);
    big.statuses = { ...big.statuses, weak: 0 };
    return { g, target: b.allies[0].id };
  }

  it('鐘の番は3・6・9…ターン目。次の鐘までのターンが予告に出る', () => {
    const g = bossBattle(withScourges(newGame('corruptionKing', ['P1', 'P2']), ['frostBellWraith']));
    const b = g.battle!;
    expect(b.boon?.bell).toEqual({ every: 3, pct: 50 });
    expect(b.turn).toBe(1);
    expect(bellLeft(b)).toBe(2);
    expect([1, 2, 3, 4, 5, 6, 9].map((turn) => bellNow({ ...b, turn }))).toEqual([false, false, true, false, false, true, true]);
    const big = bigEnemyOf(b)!;
    const v = intentView(b, big)!;
    expect(v.bell).toMatchObject({ now: false, left: 2 });
    expect(v.bell!.long).toContain('あと2ターン');
  });

  it('鐘の番: 大物の単体攻撃が、ほかの味方全員にも半分響く（予告の見込みと同じ量）。予告に「🔔鐘の番」', () => {
    const { g, target } = setup(['P1', 'P2', 'P3'], 3);
    const b = g.battle!;
    const big = bigEnemyOf(b)!;
    expect(bellStrikes(b, big)).toBe(true);
    const v = intentView(b, big)!;
    expect(v.bell).toMatchObject({ now: true, left: 0 });
    expect(v.details.some((t) => t.startsWith('🔔鐘の番: この単体攻撃は、ほかの味方全員にも半分響く'))).toBe(true);
    const others = b.allies.filter((a) => a.id !== target);
    const want = others.map((a) => bellHitsOn(b, big, a).reduce((n, x) => n + x, 0));
    expect(want.every((n) => n > 0)).toBe(true);
    expect(bellHitsOn(b, big, b.allies[0])).toEqual([]);
    // 被弾の見込み（画面と bot）にも入っている
    others.forEach((a, k) => expect(incomingDamage(b, a)).toBe(want[k]));
    const after = passTurn(g).battle!;
    others.forEach((a, k) => expect(a.hp - after.allies.find((x) => x.id === a.id)!.hp).toBe(want[k]));
    expect(after.log.some((l) => l.text.startsWith('🔔鐘の響き:'))).toBe(true);
  });

  it('鐘の番でないターンは響かない。ブロックで防げる', () => {
    const quiet = setup(['P1', 'P2'], 2);
    const other = quiet.g.battle!.allies[1];
    expect(bellStrikes(quiet.g.battle!, bigEnemyOf(quiet.g.battle!)!)).toBe(false);
    expect(passTurn(quiet.g).battle!.allies[1].hp).toBe(other.hp);
    const guard = setup(['P1', 'P2'], 3);
    guard.g.battle!.allies[1].block = 999;
    expect(passTurn(guard.g).battle!.allies[1].hp).toBe(guard.g.battle!.allies[1].hp);
  });

  it('1人の時は響く相手がいない（何も起きない・止まらない）。2人以上・保存して再開で同じ結果', () => {
    const solo = setup(['P1'], 3);
    const hp = solo.g.battle!.allies[0].hp;
    const after = passTurn(solo.g).battle!;
    expect(after.allies[0].hp).toBeLessThanOrEqual(hp);
    const two = setup(['P1', 'P2'], 3);
    expect(passTurn(json(two.g)).battle).toEqual(passTurn(two.g).battle);
  });

  it('倒すと掛からない（戦闘の印が無い）', () => {
    const g = withScourges(newGame('corruptionKing', ['P1', 'P2']), ['frostBellWraith']);
    expect(bossBattle(without(g, 'frostBellWraith')).battle!.boon).toBeUndefined();
  });
});

describe('加護: 闇の帳（灯を喰らう影）', () => {
  it('大物の最初の予告だけ、名前と数字が隠れる（種類・狙い・大技かどうかは見える）。2ターン目からは見える', () => {
    const g = bossBattle(withScourges(newGame('corruptionKing', ['P1', 'P2']), ['lampEaterShade']));
    const b = g.battle!;
    const big = bigEnemyOf(b)!;
    expect(b.boon?.veil).toBe(1);
    expect(veiledIntent(b, big)).toBe(true);
    const plain = intentView({ ...b, boon: { ...b.boon!, veil: undefined } }, big)!;
    const v = intentView(b, big)!;
    expect(v.name).toBe('？？？');
    expect(v.veil?.long).toContain('🌑闇の帳（灯を喰らう影の加護）');
    expect(v.big).toBe(!!plain.big || !!plain.behavior);
    // 数字は出ない（hidden）。種類（攻撃・全体攻撃・守り・特殊）は残る
    for (const p of v.parts) {
      if (p.kind === 'attack' || p.kind === 'attackAll' || p.kind === 'block') expect(p.hidden).toBe(true);
      else expect(p.kind).toBe('veiled');
    }
    const kindOf = (k: string) => (k === 'attack' || k === 'attackAll' || k === 'block' ? k : 'veiled');
    expect([...new Set(v.parts.map((p) => p.kind))]).toEqual([...new Set(plain.parts.map((p) => kindOf(p.kind)))]);
    expect(JSON.stringify(v)).not.toContain(getEnemyAction(big.defId, big.intent!.actionId).name);
    // ほかの敵は隠れない
    for (const e of b.enemies.filter((x) => x !== big && !x.dead)) expect(veiledIntent(b, e)).toBe(false);
    const next = passTurn(g).battle!;
    if (next.phase === 'ally') expect(veiledIntent(next, next.enemies.find((e) => e.uid === big.uid)!)).toBe(false);
  });

  it('中ボスにも掛かる。奇襲で1ターン目に予告が無い時は、2ターン目の予告に掛かる', () => {
    const g = withScourges(newGame('corruptionKing', ['P1', 'P2']), ['lampEaterShade']);
    expect(bossBattle(g, 'midboss').battle!.boon?.veil).toBe(1);
    expect(bossBattle(g, 'boss', { surprise: true }).battle!.boon?.veil).toBe(2);
  });

  it('灯火のランタンを1人でも着けていれば・見破ったボスなら掛からない（加護の一覧には残る）', () => {
    const g = withScourges(newGame('corruptionKing', ['P1', 'P2']), ['lampEaterShade']);
    const lamp = structuredClone(g);
    lamp.heroes[1].equipment.accessory = { uid: 'lamp', itemId: 'lampLantern' };
    const lb = bossBattle(lamp).battle!;
    expect(lb.boon?.ids).toEqual(['lampEaterShade']);
    expect(lb.boon?.veil).toBeUndefined();
    expect(lb.log.some((l) => l.text.includes('灯火のランタンが闇を照らし'))).toBe(true);
    const seen = structuredClone(g);
    seen.world!.insight = ['emeraldTemple'];
    expect(bossBattle(seen).battle!.boon?.veil).toBeUndefined();
    // 倒すと掛からない
    expect(bossBattle(without(g, 'lampEaterShade')).battle!.boon).toBeUndefined();
  });

  it('画面の被弾の見込みからは外れる。bot は中身を読めるまま（隠れた予告でも止まらない）', () => {
    const g = bossBattle(withScourges(newGame('corruptionKing', ['P1', 'P2']), ['lampEaterShade']));
    const b = g.battle!;
    const big = bigEnemyOf(b)!;
    const hit = b.allies.find((a) => a.id === big.intent?.targetId);
    if (hit) expect(incomingDamage(b, hit, true)).toBeLessThanOrEqual(incomingDamage(b, hit));
    // 工夫する bot で1ターン目を最後まで進められる
    let s = g;
    for (let k = 0; k < 30 && s.battle!.phase === 'ally' && s.battle!.turn === 1; k++) {
      const cmd = cleverBattleCommand(s.battle!);
      if (!cmd) break;
      s = battleCmd(s, cmd);
    }
    s = passTurn(s);
    expect(['ally', 'victory', 'defeat']).toContain(s.battle?.phase ?? 'victory');
    // 保存して再開しても同じ
    expect(bossBattle(json(withScourges(newGame('corruptionKing', ['P1', 'P2']), ['lampEaterShade']))).battle).toEqual(b);
  });
});

describe('3体の加護が重なっても、オンライン（準備完了の待ち合わせ）で止まらず、保存して再開で同じ結果', () => {
  it('2人・オンライン', () => {
    let g = withScourges(newGame('corruptionKing', ['P1', 'P2']), IDS);
    g.online = true;
    g = bossBattle(g);
    expect(g.battle!.readyCheck).toBe(true);
    let s = g;
    for (let t = 0; t < 4 && s.battle?.phase === 'ally'; t++) s = passTurn(s);
    let r = json(g);
    for (let t = 0; t < 4 && r.battle?.phase === 'ally'; t++) r = passTurn(r);
    expect(r.battle).toEqual(s.battle);
  });
});

// ---------- 専用の装備（災厄だけが落とす） ----------

describe('専用の装備: 春待ちの外套・溶けぬ氷の腕輪・春告げの錫杖', () => {
  const GEAR = ['springWaitCloak', 'everIceBracer', 'springbringerScepter'];
  const map = getScenario('frozenKingdom').map!;
  const keep = map.scourges;
  afterEach(() => {
    map.scourges = keep;
  });
  /** レジェンドの装備を何度も引いて、出た品の ID */
  const rolled = (g: GameState, held: ReadonlySet<string>) => {
    const out = new Set<string>();
    for (let s = 1; s <= 400; s++) out.add(rollEquipment('legend', g.heroes, createRng(s), { scenario: g.scenarioId, held }).id);
    return out;
  };

  it('シナリオ2の一覧に入っていなければ、登録されていても今までどおり（宝箱・店から出る）', () => {
    map.scourges = ['stormWitch'];
    const g = newGame('frozenKingdom', ['P1'], ['priest']);
    for (const id of GEAR) expect(heldByScourge(g, getItem(id))).toBe(false);
    expect(scourgeHeldGear(g).size).toBe(0);
    // まだ登録されていない災厄の印も、今までどおり
    expect(heldByScourge(g, { id: 'springWaitCloak', scourgeGear: 'notRegistered' })).toBe(false);
  });

  it('一覧に入ると（区切り3b からは、いつも）: 広い地図の冒険では宝箱・ドロップのくじから外れる。古い 8×35 の地図の冒険では今までどおり出る', () => {
    const g = newGame('frozenKingdom', ['P1', 'P2'], ['priest', 'warrior']);
    const held = scourgeHeldGear(g);
    expect([...held].sort()).toEqual([...GEAR].sort());
    const free = rolled(g, new Set());
    const got = rolled(g, held);
    expect(GEAR.some((id) => free.has(id))).toBe(true);
    for (const id of GEAR) expect(got.has(id)).toBe(false);
    // 古い 8×35 の地図（地図の大きさが違う = 広い地図でない）
    const old = structuredClone(g);
    old.world!.width = 8;
    old.world!.height = 35;
    expect(scourgeHeldGear(old).size).toBe(0);
    for (const id of GEAR) expect(heldByScourge(old, getItem(id))).toBe(false);
  });

  it('シナリオ1の冒険は何も外れない（品の出方と乱数の順番は今のまま）', () => {
    const g = newGame('corruptionKing');
    expect(scourgeHeldGear(g).size).toBe(0);
    for (const s of [1, 2, 3]) expect(rollEquipment('epic', g.heroes, createRng(s), { scenario: g.scenarioId, held: scourgeHeldGear(g) }).id).toBe(rollEquipment('epic', g.heroes, createRng(s), { scenario: g.scenarioId }).id);
  });

  it('印の付いた品は3つだけ（ほかの品は変えない）', () => {
    expect(ITEMS.all.filter((i) => i.scourgeGear).map((i) => i.id).sort()).toEqual([...GEAR].sort());
  });
});
