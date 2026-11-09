// ステップ2（オンラインの相談）: 宝箱の開け役の投票・中身の取り合い・ピンの期限
import { describe, expect, it } from 'vitest';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, chestShared, createGame } from '../index';
import { activePins, PIN_TTL_MS, type Pin } from '../../net/pins';
import { pinContext } from '../../store/pins';

function chestGame(players: PlayerId[], opts: { locked?: boolean; big?: boolean; keepWorld?: boolean } = {}): GameState {
  const g = createGame({
    seed: 5,
    scenarioId: 'corruptionKing',
    difficulty: 'normal',
    party: players.map((p, i) => ({ classId: ['warrior', 'mage', 'thief', 'priest'][i], gender: 'male', name: `仲間${i}`, playerId: p })),
  });
  // 世界マップなしでダンジョンに入る（game.test と同じ形）
  const world = g.world;
  g.world = undefined;
  g.mode = 'hub';
  const r = applyGameCommand(g, { type: 'ENTER_DUNGEON', playerId: players[0], dungeonId: 'emeraldTemple' });
  expect(r.error).toBeUndefined();
  const s = r.state;
  if (opts.keepWorld) s.world = world;
  s.mode = 'chest';
  s.dungeon!.currentRoomId = 'r2c0';
  s.chest = { roomId: 'r2c0', spec: { rarity: 'rare', locked: !!opts.locked, big: opts.big }, unlocked: !opts.locked };
  return s;
}
const ok = (g: GameState, cmd: GameCommand) => {
  const r = applyGameCommand(g, cmd);
  expect(r.error).toBeUndefined();
  return r.state;
};
const vote = (g: GameState, p: PlayerId, command: GameCommand) => ok(g, { type: 'VOTE', playerId: p, command });

describe('宝箱: 2人以上は開け役をみんなで決める', () => {
  it('2人のプレイヤーがいれば、みんなで決める宝箱', () => {
    const g = chestGame(['P1', 'P2']);
    expect(g.heroes.length).toBe(2);
    expect(chestShared(g)).toBe(true);
  });

  it('全員一致で開け役が決まり、そのキャラの担当だけが開けられる', () => {
    let g = chestGame(['P1', 'P2']);
    // 投票なしの開け役の決定・開け役なしの OPEN_CHEST は通らない
    expect(applyGameCommand(g, { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h1' }).error).toBeTruthy();
    expect(applyGameCommand(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 }).error).toBeTruthy();
    // 意見が分かれたら決まらない
    g = vote(g, 'P1', { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h0' });
    g = vote(g, 'P2', { type: 'CHEST_OPENER', playerId: 'P2', heroId: 'h1' });
    expect(g.chest!.opener).toBeUndefined();
    // P1 が「h1 に任せる」に選び直すと決まる
    g = vote(g, 'P1', { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h1' });
    expect(g.chest!.opener).toBe('h1');
    // 開け役でないキャラ・担当でない人は開けられない
    expect(applyGameCommand(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 }).error).toBeTruthy();
    expect(applyGameCommand(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h1', focusUsed: 0 }).error).toBeTruthy();
    g = ok(g, { type: 'OPEN_CHEST', playerId: 'P2', heroId: 'h1', focusUsed: 0 });
    expect(g.chest!.contents).toBeTruthy();
    expect(g.chest!.lastRoll!.heroId).toBe('h1');
  });

  it('開けた後: 品物（装備・消耗品）は取り合い。終わるまで先へ進めない。お金は今までどおり開け役へ', () => {
    let g = chestGame(['P1', 'P2']);
    g = vote(g, 'P1', { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h0' });
    g = vote(g, 'P2', { type: 'CHEST_OPENER', playerId: 'P2', heroId: 'h0' });
    const gold0 = g.heroes.map((h) => h.gold);
    g = ok(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 });
    const c = g.chest!;
    const items = c.contents!.filter((l) => l.kind === 'item');
    expect(c.claims!.length).toBe(items.length);
    expect(c.claims!.every((x) => x.heroes.join() === 'h0,h1')).toBe(true);
    // まだ誰も受け取っていない
    expect(items.every((l) => l.kind === 'item' && !l.to)).toBe(true);
    const gold = c.contents!.find((l) => l.kind === 'gold');
    if (gold && gold.kind === 'gold') {
      expect(g.heroes[0].gold - gold0[0]).toBe(gold.amount);
      expect(g.heroes[1].gold).toBe(gold0[1]);
    }
    // 取り合いが終わるまで、先へ進む（投票）は通らない
    expect(applyGameCommand(g, { type: 'VOTE', playerId: 'P1', command: { type: 'LEAVE_CHEST', playerId: 'P1' } }).error).toBeTruthy();
    // 1つ目: P2 だけ欲しい → P2 / 2つ目以降: 両方いらない → 持ち物の少ない人
    g = ok(g, { type: 'CLAIM_LOOT', playerId: 'P1', heroId: 'h0', choice: 'pass', index: 0 });
    expect(applyGameCommand(g, { type: 'CLAIM_LOOT', playerId: 'P1', heroId: 'h1', choice: 'need', index: 0 }).error).toBeTruthy();
    g = ok(g, { type: 'CLAIM_LOOT', playerId: 'P2', heroId: 'h1', choice: 'need', index: 0 });
    expect(g.chest!.claims![0].winner).toBe('h1');
    const first = g.chest!.claims![0].item.uid;
    expect([...g.heroes[1].stash, ...g.heroes[1].pouch].some((x) => x.uid === first)).toBe(true);
    for (let i = 1; i < g.chest!.claims!.length; i++) {
      g = ok(g, { type: 'CLAIM_LOOT', playerId: 'P1', heroId: 'h0', choice: 'pass', index: i });
      g = ok(g, { type: 'CLAIM_LOOT', playerId: 'P2', heroId: 'h1', choice: 'pass', index: i });
    }
    expect(g.chest!.contents!.filter((l) => l.kind === 'item').every((l) => l.kind === 'item' && !!l.to)).toBe(true);
    // 決まった取り合いは選び直せない
    expect(applyGameCommand(g, { type: 'CLAIM_LOOT', playerId: 'P1', heroId: 'h0', choice: 'need', index: 0 }).error).toBeTruthy();
    g = vote(g, 'P1', { type: 'LEAVE_CHEST', playerId: 'P1' });
    g = vote(g, 'P2', { type: 'LEAVE_CHEST', playerId: 'P2' });
    expect(g.mode).toBe('dungeon');
  });

  it('同じ操作なら全員の結果が同じ（乱数は種から）', () => {
    const play = () => {
      let g = chestGame(['P1', 'P2']);
      g = vote(g, 'P1', { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h1' });
      g = vote(g, 'P2', { type: 'CHEST_OPENER', playerId: 'P2', heroId: 'h1' });
      g = ok(g, { type: 'OPEN_CHEST', playerId: 'P2', heroId: 'h1', focusUsed: 1 });
      g = ok(g, { type: 'CLAIM_LOOT', playerId: 'P1', heroId: 'h0', choice: 'need', index: 0 });
      return ok(g, { type: 'CLAIM_LOOT', playerId: 'P2', heroId: 'h1', choice: 'need', index: 0 });
    };
    expect(play().chest).toEqual(play().chest);
  });

  it('鍵つき: 開け役が鍵を開け、続けて運のスロットも同じキャラで開ける', () => {
    let g = chestGame(['P1', 'P2'], { locked: true });
    g = vote(g, 'P1', { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h1' });
    g = vote(g, 'P2', { type: 'CHEST_OPENER', playerId: 'P2', heroId: 'h1' });
    g = ok(g, { type: 'OPEN_CHEST', playerId: 'P2', heroId: 'h1', focusUsed: 0 });
    expect(g.chest!.lastRoll!.kind).toBe('lock');
    expect(g.chest!.opener).toBe('h1');
  });

  it('ボスの大宝箱も同じ流れ。お金は今までどおり山分け', () => {
    let g = chestGame(['P1', 'P2'], { big: true });
    g = vote(g, 'P1', { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h0' });
    g = vote(g, 'P2', { type: 'CHEST_OPENER', playerId: 'P2', heroId: 'h0' });
    const gold0 = g.heroes.map((h) => h.gold);
    g = ok(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 });
    expect(g.chest!.claims!.length).toBeGreaterThanOrEqual(2);
    const gold = g.chest!.contents!.find((l) => l.kind === 'gold')!;
    expect(gold.kind === 'gold' && gold.to).toEqual(['h0', 'h1']);
    expect(g.heroes[0].gold - gold0[0] + g.heroes[1].gold - gold0[1]).toBe(gold.kind === 'gold' ? gold.amount : -1);
  });

  it('1人（または1台で全員 P1）の時は今までどおり: 投票なしで開けて、受取人を選べる', () => {
    let g = chestGame(['P1', 'P1']);
    expect(chestShared(g)).toBe(false);
    expect(applyGameCommand(g, { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h1' }).error).toBeTruthy();
    g = ok(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', recipientId: 'h1', focusUsed: 0 });
    expect(g.chest!.claims).toBeUndefined();
    for (const l of g.chest!.contents!) if (l.kind === 'item') expect(l.to).toBe('h1');
  });
});

describe('ピン（ゲームの状態にさわらない印）', () => {
  const pin = (at: number, ctx = 'a', seat: PlayerId = 'P2'): Pin => ({ seat, target: { kind: 'door', id: 'r1' }, at, ctx });
  it('約8秒で消える', () => {
    expect(activePins({ u2: pin(1000) }, 1000 + PIN_TTL_MS - 1, 'a')).toHaveLength(1);
    expect(activePins({ u2: pin(1000) }, 1000 + PIN_TTL_MS, 'a')).toHaveLength(0);
  });
  it('場面の目印が変わったら消える・消したピン（null）は出ない・新しい順', () => {
    expect(activePins({ u2: pin(1000, 'a') }, 1500, 'b')).toHaveLength(0);
    expect(activePins({ u2: null, u3: pin(1000, 'a', 'P3'), u4: pin(1200, 'a', 'P4') }, 1500, 'a').map((p) => p.seat)).toEqual(['P4', 'P3']);
  });
  it('場面の目印は、手番の人が歩く・向きを変える・手番が代わると変わる', () => {
    const g = chestGame(['P1', 'P2'], { keepWorld: true });
    g.mode = 'dungeon';
    g.chest = undefined;
    const a = pinContext(g);
    const moved = structuredClone(g);
    moved.dungeon!.pos = { ...moved.dungeon!.pos!, facing: ((moved.dungeon!.pos!.facing + 1) % 4) as 0 | 1 | 2 | 3 };
    expect(pinContext(moved)).not.toBe(a);
    const turned = structuredClone(g);
    turned.world!.turn = 'h1';
    expect(pinContext(turned)).not.toBe(a);
    expect(pinContext(structuredClone(g))).toBe(a);
  });
});
