// ===== オンライン協力の部屋（テスト用の通信で、複数の端末をまねる） =====
import { describe, expect, it } from 'vitest';
import { botNextCommand } from '../../engine/bot';
import { commandPlayer, stateHash } from '../../engine';
import { MemoryHub } from '../memoryBackend';
import { normalizeCode, Room, RoomError, seqKey, SNAPSHOT_EVERY } from '../room';

/** 通知と非同期の処理が落ち着くまで待つ */
async function settle(n = 12) {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0));
}

const classes = ['warrior', 'mage', 'guardian', 'hunter'];

/** 部屋を作って、people 人が入り、キャラを作って出発する（キャラは partySize 人。順に各端末へ割り振る） */
async function playing(people: number, partySize = people) {
  const hub = new MemoryHub();
  const host = await Room.create(hub.client('u0'), { name: 'ホスト', scenarioId: 'corruptionKing', difficulty: 'easy', partySize });
  const rooms = [host];
  for (let i = 1; i < people; i++) rooms.push(await Room.join(hub.client(`u${i}`), host.code, `P${i + 1}`));
  await settle();
  for (let i = 0; i < partySize; i++) await rooms[i % people].claimSlot(i, { classId: classes[i], gender: 'male', name: `キャラ${i}` });
  await settle();
  await host.start(7);
  await settle();
  return { hub, host, rooms };
}

const playerOf = commandPlayer;

/** 自動プレイで steps 手進める（操作は担当の端末から送る。担当のいない操作はホストから） */
async function drive(rooms: Room[], steps: number, memo = { interacted: new Set<string>() }) {
  const host = () => rooms.find((r) => r.isHost)!;
  for (let i = 0; i < steps; i++) {
    const g = host().game!;
    if (g.mode === 'ending' || g.mode === 'gameover') break;
    const cmd = botNextCommand(g, memo);
    if (!cmd) break;
    const p = playerOf(cmd);
    const sender = (p && rooms.find((r) => r.connected && r.myPlayers().includes(p))) || host();
    const before = host().seq;
    await sender.send(cmd);
    await settle();
    if (host().seq === before) throw new Error(`step ${i}: ${cmd.type} was not applied`);
  }
}

const allSame = (rooms: Room[]) => {
  const hs = rooms.map((r) => `${r.seq}:${stateHash(r.game)}`);
  return hs.every((h) => h === hs[0]);
};

describe('部屋を作る・入る', () => {
  it('合言葉は4文字。入るとP2・P3…の席。5人目は入れない', async () => {
    const hub = new MemoryHub();
    const host = await Room.create(hub.client('u0'), { name: 'A', scenarioId: 'corruptionKing', difficulty: 'normal', partySize: 2 });
    expect(host.code).toMatch(/^[A-Z2-9]{4}$/);
    expect(host.isHost).toBe(true);
    expect(host.seat).toBe('P1');
    const b = await Room.join(hub.client('u1'), host.code.toLowerCase(), 'B');
    const c = await Room.join(hub.client('u2'), host.code, 'C');
    const d = await Room.join(hub.client('u3'), host.code, 'D');
    expect([b.seat, c.seat, d.seat]).toEqual(['P2', 'P3', 'P4']);
    await expect(Room.join(hub.client('u4'), host.code, 'E')).rejects.toThrow('いっぱい');
    await expect(Room.join(hub.client('u5'), 'ZZZZ', 'E')).rejects.toBeInstanceOf(RoomError);
    // 同じ端末で入り直すと同じ席
    const b2 = await Room.join(hub.client('u1'), host.code, 'B');
    expect(b2.seat).toBe('P2');
    expect(normalizeCode(' kx-7p ')).toBe('KX7P');
  });
  it('キャラの枠は先に取った人のもの。全部うまるまで出発できない。ホストだけが出発できる', async () => {
    const hub = new MemoryHub();
    const host = await Room.create(hub.client('u0'), { name: 'A', scenarioId: 'corruptionKing', difficulty: 'normal', partySize: 2 });
    const b = await Room.join(hub.client('u1'), host.code, 'B');
    await host.claimSlot(0, { classId: 'warrior', gender: 'male', name: 'レオン' });
    await expect(b.claimSlot(0, { classId: 'mage', gender: 'female', name: 'X' })).rejects.toThrow('他の人');
    await settle();
    expect(host.startProblem()).toContain('まだ');
    await b.claimSlot(1, { classId: 'mage', gender: 'female', name: 'ルーシア' });
    await settle();
    expect(host.startProblem()).toBeNull();
    expect(b.startProblem()).toContain('ホスト');
    await host.start(1);
    await settle();
    expect(b.game?.online).toBe(true);
    expect(b.game!.heroes.map((h) => h.playerId)).toEqual(['P1', 'P2']);
    expect(stateHash(b.game)).toBe(stateHash(host.game));
    // 始まった部屋には新しい人は入れない
    await expect(Room.join(hub.client('u9'), host.code, 'Z')).rejects.toThrow('始めて');
  });
});

describe('操作の同期', () => {
  it('3台・4キャラで自動プレイ。全員の状態が最後まで同じ。記録は小さく保たれる', async () => {
    const { hub, rooms } = await playing(3, 4);
    await drive(rooms, 400);
    expect(rooms[0].seq).toBeGreaterThan(100);
    expect(allSame(rooms)).toBe(true);
    const log = hub.read(`rooms/${rooms[0].code}/log`) as Record<string, unknown>;
    expect(Object.keys(log).length).toBeLessThanOrEqual(SNAPSHOT_EVERY * 2);
    expect(hub.read(`rooms/${rooms[0].code}/requests`)).toBeNull();
  }, 60_000);

  it('担当していないキャラの操作は断られ、送った人に理由が届く', async () => {
    const { rooms } = await playing(2);
    const [host, b] = rooms;
    const got: string[] = [];
    b.on((e) => e.type === 'rejected' && got.push(e.text));
    const h0 = host.game!.heroes[0];
    await b.send({ type: 'WORLD_ROLL_MOVE', playerId: 'P2', heroId: h0.id, focusUsed: 0 });
    await settle();
    expect(host.seq).toBe(0);
    expect(got.length).toBe(1);
  });

  it('ずれた端末は、次の状態の保存の時に気づいて取り直す', async () => {
    const { rooms } = await playing(2);
    await drive(rooms, 3);
    // b の状態をわざと壊す
    rooms[1].game!.gold += 999;
    const reasons: string[] = [];
    rooms[1].on((e) => e.type === 'resync' && reasons.push(e.reason));
    await drive(rooms, SNAPSHOT_EVERY + 5);
    expect(reasons).toContain('hash');
    expect(allSame(rooms)).toBe(true);
  }, 30_000);
});

describe('切断と再接続・ホストの引き継ぎ', () => {
  it('切断した端末は、つながり直すと追いつく（古い記録が消えていたら保存から取り直す）', async () => {
    const { rooms } = await playing(3, 3);
    await drive(rooms, 5);
    const c = rooms[2];
    c.backend.goOffline();
    await settle();
    expect(rooms[0].members[c.uid].online).toBe(false);
    expect(rooms[0].seatOnline('P3')).toBe(false);
    // P3 のキャラの手番はホストが代わりに操作する
    await rooms[0].setProxy('P3', true);
    await settle();
    expect(rooms[0].myPlayers()).toEqual(['P1', 'P3']);
    await drive(rooms, SNAPSHOT_EVERY * 3);
    c.backend.goOnline();
    await settle(30);
    expect(rooms[0].members[c.uid].online).toBe(true);
    expect(c.seq).toBe(rooms[0].seq);
    expect(allSame(rooms)).toBe(true);
  }, 30_000);

  it('ホストが切断したら、次に入った人がホストになり、そのまま続けられる', async () => {
    const { rooms } = await playing(3, 3);
    await drive(rooms, 8);
    const [host, b, c] = rooms;
    host.backend.goOffline();
    await settle(30);
    expect(b.isHost).toBe(true);
    expect(c.isHost).toBe(false);
    await b.setProxy('P1', true);
    await settle();
    const rest = [b, c];
    const before = b.seq;
    await drive(rest, 30);
    expect(b.seq).toBeGreaterThan(before);
    expect(allSame(rest)).toBe(true);
    // 元のホストが戻ってきても、ホストは変わらず、追いつく
    host.backend.goOnline();
    await settle(30);
    expect(host.isHost).toBe(false);
    expect(allSame(rooms)).toBe(true);
  }, 30_000);

  it('全員抜けても、同じ合言葉で入り直して続きから遊べる', async () => {
    const { hub, rooms } = await playing(2);
    await drive(rooms, 25);
    const seq = rooms[0].seq;
    const hash = stateHash(rooms[0].game);
    const code = rooms[0].code;
    for (const r of rooms) await r.leave();
    const again = await Room.join(hub.client('u1'), code, 'B');
    await settle();
    expect(again.seat).toBe('P2');
    // 保存（snapshot）+ その後の記録で、同じところまで戻る
    expect(again.seq).toBe(seq);
    expect(stateHash(again.game)).toBe(hash);
    expect(hub.read(`rooms/${code}/log/${seqKey(seq)}`)).not.toBeNull();
  }, 30_000);
});
