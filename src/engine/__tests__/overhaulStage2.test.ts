// ===== 抜本的な見直し 段階2a: 休憩の「技を磨く」・古い保存（探索のサイコロの途中）でも読めて遊べる =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, canHoneCards, createGame, GAME_VERSION, heroMaxHp, migrateGame, moveIntoRoom, reachableRooms, validateGame, viewOf } from '../index';

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });
const tileOf = (g: GameState, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === id);

/** 2人で翠の神殿に入る（この組の番） */
function inTemple(players: PlayerId[] = ['P1', 'P1']) {
  let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((playerId, i) => ({ classId: i === 0 ? 'warrior' : 'mage', gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  g.world!.pos.h0 = g.world!.pos.h1 = tileOf(g, 'emeraldTemple');
  g.world!.turn = 'h0';
  if (players[1] !== players[0]) {
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: players[1], heroId: 'h1', accept: true });
  }
  g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
  return { g, x: g.expeditions![0].id };
}

/** 休憩の部屋に入った形にする（この手番に扉を開けて、休憩の部屋にいる） */
function inRestRoom(players: PlayerId[] = ['P1', 'P1']) {
  const { g, x } = inTemple(players);
  const e = g.expeditions![0];
  const d = e.dungeon!;
  const rest = d.rooms.find((r) => r.type === 'rest')!;
  d.currentRoomId = rest.id;
  moveIntoRoom(d, rest.id);
  d.opened = true;
  e.mode = 'rest';
  return { g, x, restId: rest.id };
}

describe('休憩の「技を磨く」', () => {
  it('選ぶと、その場のキャラ全員が自分のカードを1枚選んで＋にできる。HP・フォーカスは回復しない', () => {
    let { g, x, restId } = inRestRoom();
    for (const h of g.heroes) {
      h.hp = Math.floor(heroMaxHp(h) / 2);
      h.focus = 0;
    }
    const hp = g.heroes.map((h) => h.hp);
    g = run(g, inScene(x, { type: 'REST', playerId: 'P1', kind: 'upgrade' }));
    expect(g.heroes.map((h) => h.hp)).toEqual(hp);
    expect(g.heroes.map((h) => h.focus)).toEqual([0, 0]);
    expect(g.heroes.map((h) => h.cardTask)).toEqual(['upgrade', 'upgrade']);
    // 部屋は済みになり、通路に戻る（扉1つ＝手番1回なので、この組の手番は終わっている）
    const d = viewOf(g, x).dungeon!;
    expect(d.rooms.find((r) => r.id === restId)!.cleared).toBe(true);
    expect(viewOf(g, x).mode).toBe('dungeon');
    expect(d.opened).toBeUndefined();
    // 1人ずつ、自分のカードを1枚選ぶ（乱数は使わない）
    const rng0 = g.rngState;
    for (const h of g.heroes) {
      const card = h.deck.find((c) => !c.upgraded)!;
      g = run(g, { type: 'CARD_TASK', playerId: h.playerId, heroId: h.id, cardUid: card.uid });
      const now = g.heroes.find((q) => q.id === h.id)!;
      expect(now.deck.find((c) => c.uid === card.uid)!.upgraded).toBe(true);
      expect(now.cardTask).toBeUndefined();
    }
    expect(g.rngState).toBe(rng0);
    // 1回の休憩で1枚だけ
    expect(err(g, { type: 'CARD_TASK', playerId: 'P1', heroId: 'h0', cardUid: g.heroes[0].deck.find((c) => !c.upgraded)!.uid })).toBeTruthy();
  });

  it('休む・瞑想は今までどおり（技を磨くの印は付かない）', () => {
    const a = inRestRoom();
    a.g.heroes[0].hp = 1;
    const g1 = run(a.g, inScene(a.x, { type: 'REST', playerId: 'P1', kind: 'hp' }));
    expect(g1.heroes[0].hp).toBeGreaterThan(1);
    expect(g1.heroes.every((h) => !h.cardTask)).toBe(true);
    const b = inRestRoom();
    b.g.heroes[0].focus = 0;
    const g2 = run(b.g, inScene(b.x, { type: 'REST', playerId: 'P1', kind: 'focus' }));
    expect(g2.heroes[0].focus).toBe(BALANCE.restFocus);
    expect(g2.heroes.every((h) => !h.cardTask)).toBe(true);
  });

  it('全部＋のキャラには印が付かない。だれも磨けない時は選べない', () => {
    const { g, x } = inRestRoom();
    for (const c of g.heroes[0].deck) c.upgraded = true;
    expect(canHoneCards(g.heroes[0])).toBe(false);
    const g1 = run(g, inScene(x, { type: 'REST', playerId: 'P1', kind: 'upgrade' }));
    expect(g1.heroes[0].cardTask).toBeUndefined();
    expect(g1.heroes[1].cardTask).toBe('upgrade');
    for (const c of g.heroes[1].deck) c.upgraded = true;
    expect(err(g, inScene(x, { type: 'REST', playerId: 'P1', kind: 'upgrade' }))).toMatch(/磨けるカード/);
  });

  it('2人のプレイヤー: 休憩の3択はみんなで1つ選ぶ（票）。カードを選ぶのは、そのキャラの担当の人だけ（P2 の番でも通る）', () => {
    let { g, x } = inRestRoom(['P1', 'P2']);
    const rest = { type: 'REST', kind: 'upgrade' } as const;
    expect(err(g, inScene(x, { ...rest, playerId: 'P1' }))).toMatch(/みんなで決めます/);
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: { ...rest, playerId: 'P1' } }));
    expect(viewOf(g, x).mode).toBe('rest');
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: { ...rest, playerId: 'P2' } }));
    expect(viewOf(g, x).mode).toBe('dungeon');
    expect(g.heroes.map((h) => h.cardTask)).toEqual(['upgrade', 'upgrade']);
    const card = g.heroes[1].deck.find((c) => !c.upgraded)!;
    // P1 は P2 のキャラのカードを選べない
    expect(err(g, { type: 'CARD_TASK', playerId: 'P1', heroId: 'h1', cardUid: card.uid })).toMatch(/担当/);
    g = run(g, { type: 'CARD_TASK', playerId: 'P2', heroId: 'h1', cardUid: card.uid });
    expect(g.heroes[1].deck.find((c) => c.uid === card.uid)!.upgraded).toBe(true);
    // やめる（選ばない）こともできる
    g = run(g, { type: 'CARD_TASK', playerId: 'P1', heroId: 'h0' });
    expect(g.heroes[0].cardTask).toBeUndefined();
  });

  it('知らない種類の休憩は受け付けない', () => {
    const { g, x } = inRestRoom();
    expect(err(g, inScene(x, { type: 'REST', playerId: 'P1', kind: 'gold' } as unknown as GameCommand))).toBeTruthy();
  });
});

describe('古い保存（探索のサイコロの途中の状態が残っている）', () => {
  /** 前の版が保存していた形にする: 通路で、サイコロを振った後（残り2）・「手番を終える」の前 */
  function oldSave(mutate?: (exp: Record<string, any>) => void, prep?: (g: GameState) => void) {
    const { g, x } = inTemple();
    prep?.(g);
    const old = JSON.parse(JSON.stringify(g));
    const exp = old.expeditions.find((e: { id: string }) => e.id === x);
    exp.dungeon.explore = 2;
    exp.dungeon.exploreDice = { sides: 3, face: 2, bonus: [], total: 2, seq: 5, heroId: 'h0' };
    exp.dungeon.exploreRoller = { heroId: 'h0', turn: '2:h0' };
    mutate?.(exp);
    return { old, x };
  }

  it('読める（今の版のまま）。サイコロの項目は捨てて、そのまま扉を1つ選べる。部屋を済ませると手番が終わる', () => {
    const { old, x } = oldSave();
    expect(old.version).toBe(GAME_VERSION);
    expect(GAME_VERSION).toBe(18);
    const m = migrateGame(old)!;
    expect(m).not.toBeNull();
    expect(validateGame(m)).toBe(true);
    const d = m.expeditions![0].dungeon! as unknown as Record<string, unknown>;
    expect(d.explore).toBeUndefined();
    expect(d.exploreDice).toBeUndefined();
    let g = run(m, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }));
    expect(viewOf(g, x).mode).toBe('battle');
    const wt = g.world!.worldTurn;
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g.expeditions![0].dungeon!.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    g = run(g, inScene(x, { type: 'DUNGEON_TURN', playerId: 'P1', heroId: 'h0', dir: 'left' }));
    // 全員が中なので、ワールドターンが進んで、また同じ組の番
    expect(g.world!.worldTurn).toBe(wt + 1);
    expect(reachableRooms(viewOf(g, x).dungeon!).length).toBeGreaterThan(0);
  });

  it('「扉を選び終えた（残り0）・手番を終える前」で保存していても、詰まらずに次の扉を選べる', () => {
    const { old, x } = oldSave((exp) => {
      exp.dungeon.explore = 0;
      exp.dungeon.ended = false;
    }, (g) => {
      const d = g.expeditions![0].dungeon!;
      d.currentRoomId = 'r0c0';
      moveIntoRoom(d, 'r0c0');
      d.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    });
    const m = migrateGame(old)!;
    expect(m).not.toBeNull();
    const next = reachableRooms(viewOf(m, x).dungeon!)[0];
    expect(err(m, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: next.id }))).toBeUndefined();
  });

  it('サイコロを振る前（null）・「だれが振る？」の票の途中でも読めて、扉を選べる', () => {
    const { old, x } = oldSave((exp) => {
      exp.dungeon.explore = null;
      delete exp.dungeon.exploreDice;
      exp.vote = { ctx: 'x', picks: { P1: { type: 'EXPLORE_ROLLER', playerId: 'P1', heroId: 'h0' } } };
    });
    const m = migrateGame(old)!;
    expect(m).not.toBeNull();
    expect(err(m, inScene(x, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' }))).toBeUndefined();
  });

  it('自動プレイ（bot）は、移した保存からそのまま進められる', async () => {
    const { playToEnd } = await import('../bot');
    const { old } = oldSave();
    const { log } = playToEnd(migrateGame(old)!, 400);
    expect(log.errors).toEqual([]);
  });
});
