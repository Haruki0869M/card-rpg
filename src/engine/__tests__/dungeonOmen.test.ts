// ===== 抜本的な見直し 段階2: 扉の予兆（5色・いつも見える）・先読み（感知・フクロウ・霊感）・周囲の警戒（フォーカス1） =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CLASSES } from '../../data/classes';
import { DUNGEONS } from '../../data/dungeons';
import { getEnemy } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { CHEST_NAME } from '../../data/terms';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { createRng } from '../rng';
import {
  applyGameCommand,
  buildDungeon,
  canWatchHere,
  createGame,
  doorBeyond,
  doorDepthBonus,
  doorDetail,
  doorKind,
  doorOmen,
  hasForesight,
  heroSensesDoors,
  moveIntoRoom,
  omenOfType,
  partySensesDoors,
  reachableRooms,
  statChance,
  viewOf,
} from '../index';

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });
const tileOf = (g: GameState, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === id);

/** 2人（h0 = classId、h1 = 魔法使い）で翠の神殿に入り、最初の部屋 r0c0 を済ませて通路に戻った状態（この組の番）にする */
function pastFirstRoom(classId = 'warrior', players: PlayerId[] = ['P1', 'P1']) {
  let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((playerId, i) => ({ classId: i === 0 ? classId : 'warrior', gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  g.world!.pos.h0 = g.world!.pos.h1 = tileOf(g, 'emeraldTemple');
  g.world!.turn = 'h0';
  if (players[1] !== players[0]) {
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: players[1], heroId: 'h1', accept: true });
  }
  g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
  const x = g.expeditions![0].id;
  const e = g.expeditions![0];
  // 最初の部屋を済ませた形にする（戦闘は飛ばす）
  const d = e.dungeon!;
  d.currentRoomId = 'r0c0';
  moveIntoRoom(d, 'r0c0');
  d.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
  for (const h of g.heroes) h.focus = 2;
  return { g, x };
}
const view = (g: GameState, x: string) => viewOf(g, x);
const sensingClass = () =>
  CLASSES.all.find((c) => c.exploreAbility.effect.kind !== 'sense' && statChance(createGame({ seed: 1, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: c.id, gender: 'male', name: 'a', playerId: 'P1' }] }).heroes[0], 'per') >= BALANCE.dungeonSensePer)!;
const OWL = { petId: 'owl', color: 'brown', name: 'ホー', love: 0, acts: 0 };

describe('扉の予兆（5色）は、だれでも・いつでも見える', () => {
  it('次の行の扉に、部屋の種類ごとの予兆が出る（赤=戦闘・紫=強敵・金=宝箱・緑=休憩・青=イベント）。感知もお供も要らない', () => {
    const { g, x } = pastFirstRoom('warrior');
    const v = view(g, x);
    expect(partySensesDoors(v)).toBe(false);
    const d = v.dungeon!;
    const reach = reachableRooms(d);
    expect(reach.length).toBeGreaterThan(0);
    const want = { battle: 'danger', elite: 'elite', chest: 'treasure', rest: 'rest', event: 'mystery' } as Record<string, string>;
    for (const r of d.rooms) {
      if (reach.some((q) => q.id === r.id)) expect(doorOmen(v, r), r.id).toBe(want[r.type]);
      else expect(doorOmen(v, r), r.id).toBeUndefined();
    }
  });

  it('強敵は戦闘と別の色。全部の部屋の種類に、予兆か重い扉の見た目がある', () => {
    expect(omenOfType('battle')).toBe('danger');
    expect(omenOfType('elite')).toBe('elite');
    expect(omenOfType('chest')).toBe('treasure');
    expect(omenOfType('rest')).toBe('rest');
    expect(omenOfType('event')).toBe('mystery');
    // ボス・中ボスは予兆の色を出さず、扉の見た目で分かる
    expect(omenOfType('boss')).toBeUndefined();
    expect(omenOfType('midboss')).toBeUndefined();
    expect(doorKind({ type: 'boss' })).toBe('boss');
    expect(doorKind({ type: 'midboss' })).toBe('midboss');
    expect(doorKind({ type: 'battle' })).toBe('door');
  });

  it('入口の通路でも、最初の扉の予兆が出る。入った部屋・済んだ部屋には出ない', () => {
    const { g, x } = pastFirstRoom('warrior');
    const fresh = structuredClone(g);
    const d = fresh.expeditions![0].dungeon!;
    d.currentRoomId = undefined;
    d.rooms.find((r) => r.id === 'r0c0')!.cleared = false;
    const v = view(fresh, x);
    expect(doorOmen(v, v.dungeon!.rooms.find((r) => r.id === 'r0c0')!)).toBe('danger');
    const v2 = view(g, x);
    expect(doorOmen(v2, v2.dungeon!.rooms.find((r) => r.id === 'r0c0')!)).toBeUndefined();
  });

  it('扉の先の深層ボーナスの文: 3行目から「浅層：報酬+15%」、5行目から中層、7行目から深層。戦闘のある部屋だけ', () => {
    const eventIds = EVENTS.all.filter((e) => e.where !== 'map' && e.where !== 'spawn').map((e) => e.id);
    const final = DUNGEONS.all.find((d) => d.layout?.some((row) => row.some((r) => r.type === 'midboss')))!;
    const d = buildDungeon(final.id, createRng(1), 0, eventIds);
    for (const r of d.rooms) {
      const text = doorDepthBonus(d, r);
      // 戦闘のある部屋（戦闘・強敵・中ボス・ボス・封魔の宝箱の番人）
      const battle = ['battle', 'elite', 'midboss', 'boss', 'sealedChest'].includes(r.type);
      if (!battle || r.row < 2) expect(text, r.id).toBeUndefined();
      else if (r.row < 4) expect(text).toBe(`浅層：報酬+${Math.round(BALANCE.depthBonus.reward[1] * 100)}%`);
      else if (r.row < 6) expect(text).toBe(`中層：報酬+${Math.round(BALANCE.depthBonus.reward[2] * 100)}%`);
      else expect(text).toBe(`深層：報酬+${Math.round(BALANCE.depthBonus.reward[3] * 100)}%`);
    }
  });
});

describe('先読み（2段階目）', () => {
  it('先読みができるキャラ: 感知の成功率が高い職・フクロウのお供・霊感（召喚士）。倒れていると無し', () => {
    const one = (classId: string) => createGame({ seed: 1, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId, gender: 'male', name: 'a', playerId: 'P1' }] }).heroes[0];
    const warrior = one('warrior');
    expect(statChance(warrior, 'per')).toBeLessThan(BALANCE.dungeonSensePer);
    expect(heroSensesDoors(warrior)).toBe(false);
    expect(heroSensesDoors(one(sensingClass().id))).toBe(true);
    expect(heroSensesDoors(one('summoner'))).toBe(true);
    expect(heroSensesDoors({ ...warrior, pet: OWL })).toBe(true);
    expect(heroSensesDoors({ ...warrior, pet: OWL, hp: 0 })).toBe(false);
  });

  it('先読みができないパーティでは、色だけ。中身（敵の名前など）と、その先の扉は出ない', () => {
    const { g, x } = pastFirstRoom('warrior');
    const v = view(g, x);
    expect(hasForesight(v)).toBe(false);
    for (const r of reachableRooms(v.dungeon!)) {
      expect(doorDetail(v, r)).toBeUndefined();
      expect(doorBeyond(v, r)).toEqual([]);
    }
  });

  it('フクロウがいると、次の行の扉の中身（敵の名前・宝箱の種類・イベントの題）と、その先の扉の色が分かる。乱数は使わない', () => {
    const { g, x } = pastFirstRoom('warrior');
    g.heroes[0].pet = OWL;
    const v = view(g, x);
    expect(hasForesight(v)).toBe(true);
    const d = v.dungeon!;
    for (const r of reachableRooms(d)) {
      const detail = doorDetail(v, r);
      if (r.enemies?.length) for (const e of r.enemies) expect(detail).toContain(getEnemy(e.defId).name);
      else if (r.type === 'chest') expect(detail).toContain(CHEST_NAME[r.chest?.rarity ?? 'common']);
      else if (r.type === 'event') expect(detail).toBe(EVENTS.get(r.eventId!).title);
      else expect(detail).toBeUndefined();
      // その先（次の次の行）の扉: つながっている部屋の数だけ、左から
      const beyond = doorBeyond(v, r);
      expect(beyond.length).toBe(r.next.length);
      const nexts = r.next.map((id) => d.rooms.find((q) => q.id === id)!).sort((a, b) => a.col - b.col);
      expect(beyond).toEqual(nexts.map((q) => (doorKind(q) === 'door' ? omenOfType(q.type) : doorKind(q))));
    }
    // 次の行でない扉には出ない
    const farRoom = d.rooms.find((r) => r.row >= 3)!;
    expect(doorDetail(v, farRoom)).toBeUndefined();
    expect(doorBeyond(v, farRoom)).toEqual([]);
  });

  it('感知の高い職・霊感でも同じように見える', () => {
    for (const classId of [sensingClass().id, 'summoner']) {
      const { g, x } = pastFirstRoom(classId);
      const v = view(g, x);
      expect(hasForesight(v), classId).toBe(true);
      expect(reachableRooms(v.dungeon!).some((r) => doorDetail(v, r) !== undefined), classId).toBe(true);
    }
  });
});

describe('周囲の警戒（フォーカス1・判定なし）', () => {
  it('フォーカスを1払うと、その通路で先読みが見える。乱数は引かない。手番は使わない', () => {
    let { g, x } = pastFirstRoom('warrior');
    const before = view(g, x);
    expect(hasForesight(before)).toBe(false);
    const rng0 = g.rngState;
    const turn0 = g.world!.turn;
    g = run(g, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h0' }));
    expect(g.heroes[0].focus).toBe(2 - BALANCE.dungeonScoutFocus);
    expect(g.heroes[1].focus).toBe(2);
    expect(g.rngState).toBe(rng0);
    expect(g.world!.turn).toBe(turn0);
    const v = view(g, x);
    expect(hasForesight(v)).toBe(true);
    expect(canWatchHere(v.dungeon!)).toBe(false);
    const reach = reachableRooms(v.dungeon!);
    expect(reach.some((r) => doorDetail(v, r) !== undefined)).toBe(true);
    for (const r of reach) expect(doorBeyond(v, r).length).toBe(r.next.length);
    // 応援などの戦闘の効果は付かない（前の「成功2で応援」は無くなった）
    for (const h of g.heroes) expect(h.nextBattleStatuses.inspired ?? 0).toBe(0);
  });

  it('1つの通路で1回だけ。フォーカスが無いキャラは払えない。同じ操作なら同じ結果', () => {
    const { g, x } = pastFirstRoom('warrior');
    const a = run(g, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h0' }));
    const b = run(g, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h0' }));
    expect(a).toEqual(b);
    expect(err(a, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h0' }))).toMatch(/もう警戒/);
    expect(err(a, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h1' }))).toMatch(/もう警戒/);
    const none = structuredClone(g);
    none.heroes[0].focus = 0;
    expect(err(none, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h0' }))).toMatch(/フォーカス/);
    // 倒れているキャラも払えない
    const dead = structuredClone(g);
    dead.heroes[1].hp = 0;
    expect(err(dead, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h1' }))).toBeTruthy();
  });

  it('次の通路へ進むと、先読みは消えて、また警戒できる', () => {
    let { g, x } = pastFirstRoom('warrior');
    g = run(g, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h0' }));
    const next = reachableRooms(view(g, x).dungeon!)[0];
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: next.id }));
    const e = g.expeditions![0];
    e.mode = 'dungeon';
    e.battle = e.chest = e.event = undefined;
    e.dungeon!.rooms.find((r) => r.id === next.id)!.cleared = true;
    const v = view(g, x);
    expect(hasForesight(v)).toBe(false);
    expect(canWatchHere(v.dungeon!)).toBe(true);
    for (const r of reachableRooms(v.dungeon!)) expect(doorDetail(v, r)).toBeUndefined();
  });

  it('2人のプレイヤー: P2 は自分のキャラのフォーカスで警戒できる（手番のキャラが P1 でも）。他人のキャラでは払えない', () => {
    const { g, x } = pastFirstRoom('warrior', ['P1', 'P2']);
    expect(g.world!.turn).toBe('h0');
    // 他人のキャラ
    expect(err(g, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P2', heroId: 'h0' }))).toMatch(/担当/);
    expect(err(g, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h1' }))).toMatch(/担当/);
    // P2 が自分のキャラ（h1）で
    const a = run(g, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P2', heroId: 'h1' }));
    expect(a.heroes[1].focus).toBe(1);
    expect(a.heroes[0].focus).toBe(2);
    expect(hasForesight(view(a, x))).toBe(true);
    // 手番のキャラが P2 のキャラの時（h0 が倒れている）も、P2 のキャラで払える
    const p2turn = structuredClone(g);
    p2turn.heroes[0].hp = 0;
    p2turn.world!.turn = 'h1';
    const b = run(p2turn, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P2', heroId: 'h1' }));
    expect(b.heroes[1].focus).toBe(1);
  });

  it('みんなで決める操作ではない（票は要らない）。ダンジョンの番でない時・通路でない時は使えない', () => {
    const { g, x } = pastFirstRoom('warrior', ['P1', 'P2']);
    // 票なしで、そのまま通る
    expect(err(g, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h0' }))).toBeUndefined();
    const resting = structuredClone(g);
    resting.expeditions![0].mode = 'rest';
    expect(err(resting, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h0' }))).toMatch(/通路/);
  });

  it('場面の外のキャラ（世界マップにいる仲間）は払えない', () => {
    let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: (['P1', 'P1'] as PlayerId[]).map((playerId, i) => ({ classId: 'warrior', gender: 'male' as const, name: `h${i}`, playerId })) });
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    g.world!.pos.h0 = tileOf(g, 'emeraldTemple');
    g.world!.turn = 'h0';
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] });
    const x = g.expeditions![0].id;
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h1' });
    g.heroes[1].focus = 2;
    expect(err(g, inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h1' }))).toMatch(/警戒できません/);
  });
});

describe('フクロウのお知らせ', () => {
  it('フクロウがいて、扉の先が新しく読めたら「扉の先を見通した」。いなければ出ない（警戒で読めた時も出ない）', async () => {
    const { explorationNotices } = await import('../../store/presentation');
    const { g, x } = pastFirstRoom('warrior');
    const cmd = inScene(x, { type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'left' });
    const withOwl = structuredClone(g);
    withOwl.heroes[0].pet = OWL;
    expect(explorationNotices(g, withOwl, cmd).map((n) => n.name)).toContain('扉の先を見通した');
    expect(explorationNotices(withOwl, withOwl, cmd).map((n) => n.name)).not.toContain('扉の先を見通した');
    const scout = inScene(x, { type: 'DUNGEON_SCOUT', playerId: 'P1', heroId: 'h0' });
    expect(explorationNotices(g, run(g, scout), scout).map((n) => n.name)).not.toContain('扉の先を見通した');
  });
});
