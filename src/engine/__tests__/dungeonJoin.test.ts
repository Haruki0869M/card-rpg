// ===== 抜本的な見直し 段階2b: 同じダンジョンに後から入った仲間は、先の組に合流できる（オーナーの決定 5-B・計画書 §1-4） =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, createGame, currentVote, dungeonJoin, GAME_VERSION, migrateGame, moveIntoRoom, reachableRooms, validateGame, viewOf, voteCtx, voters } from '../index';

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });
const dungeonTile = (g: GameState, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === id);

/**
 * h0（P1）が先に翠の神殿に入り、h1（P2。3人の時は h2 = P3 も）は入口のマスに立っている。今は h1 の番。
 * players を全部 P1 にすると、1台で遊ぶ形
 */
function aheadAndBehind(players: PlayerId[] = ['P1', 'P2']) {
  let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((playerId, i) => ({ classId: ['warrior', 'mage', 'priest'][i], gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  const tile = dungeonTile(g, 'emeraldTemple');
  for (const h of g.heroes) g.world!.pos[h.id] = tile;
  g.world!.turn = 'h0';
  g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] });
  expect(g.expeditions![0].heroes).toEqual(['h0']);
  expect(g.world!.turn).toBe('h1');
  return { g, x: g.expeditions![0].id, tile };
}
const join = (g: GameState, heroId = 'h1'): GameCommand => ({ type: 'WORLD_INTERACT', playerId: g.heroes.find((h) => h.id === heroId)!.playerId, heroId, party: [heroId] });

describe('ダンジョンへの合流', () => {
  it('① 後から入ると、新しい組は作らず、先の組に入る（タブは1つ）。侵食度+2%・その手番は終わる。乱数は引かない', () => {
    const { g, x, tile } = aheadAndBehind();
    expect(g.expeditions![0].entranceTile).toBe(tile);
    expect(dungeonJoin(g, tile)).toMatchObject({ exp: { id: x } });
    expect(dungeonJoin(g, tile)!.blocked).toBeUndefined();
    const before = g.world!.corruption;
    const rooms = JSON.stringify(g.expeditions![0].dungeon!.rooms);
    const after = run(g, join(g));
    expect(after.expeditions!.length).toBe(1);
    expect(after.expeditions![0].id).toBe(x);
    // 組の順番: 先に入った人が先頭、後から来た人は末尾
    expect(after.expeditions![0].heroes).toEqual(['h0', 'h1']);
    expect(after.world!.corruption).toBeGreaterThanOrEqual(before + BALANCE.corruptionOnDungeonEnter);
    // ダンジョンは作り直さない（部屋・敵は先の組のまま）。乱数も引かない（ワールドターンが進んだ分は別）
    expect(JSON.stringify(after.expeditions![0].dungeon!.rooms)).toBe(rooms);
    expect(after.log.some((l) => l.text.includes('追いついた'))).toBe(true);
    // 合流したキャラの手番は終わり、全員がダンジョンの中なので、ワールドターンが進んで組の番になる
    expect(after.world!.worldTurn).toBe(g.world!.worldTurn + 1);
    expect(after.expeditions![0].heroes).toContain(after.world!.turn);
    // 世界マップの操作はもうできない
    expect(err(after, { type: 'WORLD_ROLL_MOVE', playerId: 'P2', heroId: 'h1' })).toBeTruthy();
  });

  it('① 合流では乱数を引かない（3人: 1人が外に残り、ワールドターンが進まない形で確かめる）', () => {
    const { g } = aheadAndBehind(['P1', 'P2', 'P3']);
    const after = run(g, join(g));
    expect(after.rngState).toBe(g.rngState);
    expect(after.world!.worldTurn).toBe(g.world!.worldTurn);
    // 次は外に残った h2 の番
    expect(after.world!.turn).toBe('h2');
    expect(after.expeditions![0].heroes).toEqual(['h0', 'h1']);
  });

  it('② 先の組が通路にいない時（戦闘・報酬・宝箱・イベント・休憩・制覇の後）は断る。手番も侵食度も、何も変わらない', () => {
    const { g, tile } = aheadAndBehind();
    for (const mode of ['battle', 'reward', 'chest', 'event', 'rest', 'cleared'] as const) {
      const busy = structuredClone(g);
      busy.expeditions![0].mode = mode;
      const info = dungeonJoin(busy, tile)!;
      expect(info.blocked, mode).toMatch(/終わってから合流しよう/);
      const r = applyGameCommand(busy, join(busy));
      expect(r.error, mode).toMatch(/終わってから合流しよう/);
      // 断られた時は、元の状態のまま（侵食度・手番・行動済み・組）
      expect(r.state, mode).toBe(busy);
      expect(r.state.world!.corruption).toBe(g.world!.corruption);
      expect(r.state.world!.turn).toBe('h1');
      expect(r.state.expeditions![0].heroes).toEqual(['h0']);
    }
    // 断られた後も、同じ手番でほかの事（待つなど）ができる
    const busy = structuredClone(g);
    busy.expeditions![0].mode = 'battle';
    expect(err(busy, { type: 'WORLD_WAIT', playerId: 'P2', heroId: 'h1' })).toBeUndefined();
  });

  it('③ 合流した瞬間に、出しかけの票は無効になる（半分だけ集まった票で決まらない）', () => {
    // 3人: h0・h1 が先に入り、h0 だけが扉に票を入れた所へ h2 が合流する
    let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: (['P1', 'P2', 'P3'] as PlayerId[]).map((playerId, i) => ({ classId: ['warrior', 'mage', 'priest'][i], gender: 'male' as const, name: `h${i}`, playerId })) });
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const tile = dungeonTile(g, 'emeraldTemple');
    for (const h of g.heroes) g.world!.pos[h.id] = tile;
    g.world!.turn = 'h0';
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P2', heroId: 'h1', accept: true });
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
    const x = g.expeditions![0].id;
    expect(g.expeditions![0].heroes).toEqual(['h0', 'h1']);
    // h2 が外で待つ → 組の番。P1 だけが扉に票を入れる（まだ開かない）
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P3', heroId: 'h2' });
    const enter = { type: 'ENTER_ROOM', roomId: 'r0c0' } as const;
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: { ...enter, playerId: 'P1' } }));
    expect(currentVote(viewOf(g, x))?.picks.P1).toBeDefined();
    // 次のワールドターンに h2 が合流する形にする（組の番を飛ばして h2 の番に）
    g.world!.turn = 'h2';
    g.world!.acted = ['h0', 'h1'];
    g = run(g, join(g, 'h2'));
    const v = viewOf(g, x);
    expect(voters(v).sort()).toEqual(['P1', 'P2', 'P3']);
    expect(currentVote(v)).toBeUndefined();
    expect(g.expeditions![0].vote).toBeUndefined();
    // 改めて3人全員が同じ扉を選ぶと開く（2人だけでは開かない）
    g.world!.turn = 'h0';
    g.world!.acted = [];
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P1', command: { ...enter, playerId: 'P1' } }));
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P2', command: { ...enter, playerId: 'P2' } }));
    expect(viewOf(g, x).dungeon!.currentRoomId).toBeUndefined();
    g = run(g, inScene(x, { type: 'VOTE', playerId: 'P3', command: { ...enter, playerId: 'P3' } }));
    expect(viewOf(g, x).dungeon!.currentRoomId).toBe('r0c0');
  });

  it('③ 場の人数が変わると、票の目印（voteCtx）が変わる（票を消し忘れても、古い票は数えない）', () => {
    const { g, x } = aheadAndBehind(['P1', 'P2', 'P3']);
    const ctx0 = voteCtx(viewOf(g, x));
    const after = run(g, join(g));
    const ctx1 = voteCtx(viewOf(after, x));
    expect(ctx1).not.toBe(ctx0);
    // 合流の前の目印の票を戻しても、今の票としては数えない
    after.expeditions![0].vote = { ctx: ctx0, picks: { P1: { type: 'RETREAT', playerId: 'P1' } } };
    expect(currentVote(viewOf(after, x))).toBeUndefined();
  });

  it('④ 合流した人は、次の戦闘に参加する。扉の投票にも入る', () => {
    const { g, x } = aheadAndBehind();
    let s = run(g, join(g));
    // 2人の番: 2人が同じ扉を選ぶと開いて、戦闘は2人
    const enter = { type: 'ENTER_ROOM', roomId: 'r0c0' } as const;
    expect(err(s, inScene(x, { ...enter, playerId: 'P1' }))).toMatch(/みんなで決めます/);
    s = run(s, inScene(x, { type: 'VOTE', playerId: 'P1', command: { ...enter, playerId: 'P1' } }));
    s = run(s, inScene(x, { type: 'VOTE', playerId: 'P2', command: { ...enter, playerId: 'P2' } }));
    const v = viewOf(s, x);
    expect(v.mode).toBe('battle');
    expect(v.battle!.allies.map((a) => a.id).sort()).toEqual(['h0', 'h1']);
  });

  it('④ 先の組が部屋を済ませた後の通路にも合流できる（組の今の場所から一緒に進む）', () => {
    const { g, x } = aheadAndBehind();
    const d = g.expeditions![0].dungeon!;
    d.currentRoomId = 'r0c0';
    moveIntoRoom(d, 'r0c0');
    d.rooms.find((r) => r.id === 'r0c0')!.cleared = true;
    const s = run(g, join(g));
    const v = viewOf(s, x);
    expect(v.dungeon!.currentRoomId).toBe('r0c0');
    expect(s.expeditions![0].heroes).toEqual(['h0', 'h1']);
    expect(reachableRooms(v.dungeon!).length).toBeGreaterThan(0);
  });

  it('⑤ 同じIDの、別のマスのランダムダンジョンには合流しない（別の組になる）', () => {
    const { g } = aheadAndBehind(['P1', 'P1']);
    const w = g.world!;
    // 別のマスに、同じIDのランダムダンジョンを2つ置く（地域ごとに同じIDが置かれるのと同じ形）
    const free = w.tiles.map((t, i) => (!t.f ? i : -1)).filter((i) => i >= 0);
    const [a, b] = [free[0], free[1]];
    w.tiles[a].f = { kind: 'dungeon', id: 'randomForest' };
    w.tiles[b].f = { kind: 'dungeon', id: 'randomForest' };
    // h1 が a のランダムダンジョンに入る
    w.pos.h1 = a;
    let s = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h1', party: ['h1'] });
    expect(s.expeditions!.length).toBe(2);
    const first = s.expeditions![1];
    expect(first.dungeon!.random).toBe(true);
    expect(first.entranceTile).toBe(a);
    // 同じIDでも、別のマス b は合流の相手にならない。同じマス a は相手になる
    expect(dungeonJoin(s, b)).toBeUndefined();
    expect(dungeonJoin(s, a)).toMatchObject({ exp: { id: first.id } });
    // 入口のマスの記録が無い組（古い保存）のランダムダンジョンは、同じマスでも相手にしない
    const old = structuredClone(s);
    delete old.expeditions![1].entranceTile;
    expect(dungeonJoin(old, a)).toBeUndefined();
  });

  it('⑥ 古い保存（入口のマスの記録が無い組）: 読めて、固定のダンジョンならIDだけで合流できる', () => {
    const { g, x, tile } = aheadAndBehind();
    const old = JSON.parse(JSON.stringify(g));
    delete old.expeditions[0].entranceTile;
    expect(old.version).toBe(GAME_VERSION);
    expect(GAME_VERSION).toBe(20);
    const m = migrateGame(old)!;
    expect(m).not.toBeNull();
    expect(validateGame(m)).toBe(true);
    expect(m.expeditions![0].entranceTile).toBeUndefined();
    expect(dungeonJoin(m, tile)).toMatchObject({ exp: { id: x } });
    const s = run(m, join(m));
    expect(s.expeditions!.length).toBe(1);
    expect(s.expeditions![0].heroes).toEqual(['h0', 'h1']);
  });

  it('同行している仲間（誘いを承知した他の人のキャラ）も、一緒に合流する', () => {
    const { g } = aheadAndBehind(['P1', 'P2', 'P3']);
    let s = run(g, { type: 'WORLD_INVITE', playerId: 'P2', heroId: 'h1', targetId: 'h2' });
    s = run(s, { type: 'WORLD_INVITE_ANSWER', playerId: 'P3', heroId: 'h2', accept: true });
    s = run(s, { type: 'WORLD_INTERACT', playerId: 'P2', heroId: 'h1', party: ['h1', 'h2'] });
    expect(s.expeditions!.length).toBe(1);
    expect(s.expeditions![0].heroes).toEqual(['h0', 'h1', 'h2']);
    expect(s.log.some((l) => l.text.includes('h1とh2が'))).toBe(true);
  });

  it('1台で遊ぶ時（全員 P1）も同じ: P2 の番にあたる2人目のキャラの操作で合流できる', () => {
    const { g } = aheadAndBehind(['P1', 'P1']);
    const s = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h1', party: ['h1'] });
    expect(s.expeditions!.length).toBe(1);
    expect(s.expeditions![0].heroes).toEqual(['h0', 'h1']);
  });

  it('手番でない人・他人のキャラでは合流できない（今までの「入る」と同じ確かめ）', () => {
    const { g } = aheadAndBehind(['P1', 'P2', 'P3']);
    // h1 の番に、h2 では入れない
    expect(err(g, join(g, 'h2'))).toMatch(/手番/);
    // P1 が P2 のキャラで入ることもできない
    expect(err(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h1', party: ['h1'] })).toMatch(/担当/);
  });

  it('途中で1人だけ抜ける操作は無い（撤退は組の全員。合流した人も一緒に出る）', () => {
    const { g, x } = aheadAndBehind();
    let s = run(g, join(g));
    s = run(s, inScene(x, { type: 'VOTE', playerId: 'P1', command: { type: 'RETREAT', playerId: 'P1' } }));
    expect(s.expeditions!.length).toBe(1);
    s = run(s, inScene(x, { type: 'VOTE', playerId: 'P2', command: { type: 'RETREAT', playerId: 'P2' } }));
    expect(s.expeditions ?? []).toEqual([]);
  });
});
