// ===== 本物の Firebase（手元のエミュレーター）で、部屋の同期とセキュリティルールを確かめる =====
// 普段のテストでは動かさない。エミュレーターを起動してから:
//   npm run emulators &        （別の画面で）
//   EMU=1 npx vitest run firebase
import { describe, expect, it } from 'vitest';
import { botNextCommand } from '../../engine/bot';
import { stateHash } from '../../engine';
import type { GameCommand, PlayerId } from '../../types';
import type { Backend } from '../backend';
import { connectFirebase } from '../firebaseBackend';
import { Room } from '../room';

const HOST = process.env.EMU_HOST ?? '127.0.0.1';
let n = 0;
const client = (): Promise<Backend> => connectFirebase({ emulatorHost: HOST, appName: `t${Date.now()}-${n++}` });

async function until(cond: () => boolean, ms = 10_000, what = '') {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`timeout: ${what}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}

const playerOf = (cmd: GameCommand): PlayerId | undefined => (cmd.type === 'BATTLE' ? ('playerId' in cmd.command ? cmd.command.playerId : undefined) : cmd.playerId);

async function drive(rooms: Room[], steps: number, memo = { interacted: new Set<string>() }) {
  const host = () => rooms.find((r) => r.isHost)!;
  for (let i = 0; i < steps; i++) {
    const g = host().game!;
    if (g.mode === 'ending' || g.mode === 'gameover') break;
    const cmd = botNextCommand(g, memo);
    if (!cmd) break;
    const p = playerOf(cmd);
    const sender = (p && rooms.find((r) => r.connected && r.myPlayers().includes(p))) || host();
    const target = host().seq + 1;
    await sender.send(cmd);
    await until(() => rooms.every((r) => !r.connected || r.seq >= target), 10_000, `step ${i} ${cmd.type}`);
  }
}

const same = (rooms: Room[]) => new Set(rooms.map((r) => `${r.seq}:${stateHash(r.game)}`)).size === 1;

describe.skipIf(!process.env.EMU)('Firebase（エミュレーター）', () => {
  it('3台で部屋を作って遊び、切断・再接続・ホストの引き継ぎをしても全員一致する', async () => {
    const [a, b, c] = await Promise.all([client(), client(), client()]);
    const host = await Room.create(a, { name: 'A', scenarioId: 'corruptionKing', difficulty: 'easy', partySize: 3 });
    const rb = await Room.join(b, host.code, 'B');
    const rc = await Room.join(c, host.code, 'C');
    const rooms = [host, rb, rc];
    await host.claimSlot(0, { classId: 'warrior', gender: 'male', name: 'A' });
    await rb.claimSlot(1, { classId: 'mage', gender: 'female', name: 'B' });
    await rc.claimSlot(2, { classId: 'hunter', gender: 'male', name: 'C' });
    await until(() => host.startProblem() === null, 5000, 'slots');
    await host.start(5);
    await until(() => rooms.every((r) => r.game), 5000, 'start');
    await drive(rooms, 60);
    expect(same(rooms)).toBe(true);

    // 1台が切断 → ホストが代わりに操作 → つながり直して追いつく
    c.goOffline();
    await until(() => host.seatOnline('P3') === false, 10_000, 'offline seen');
    await host.setProxy('P3', true);
    await until(() => host.myPlayers().includes('P3'), 5000, 'proxy');
    await drive([host, rb], 50);
    c.goOnline();
    await until(() => rc.seq === host.seq, 15_000, 'catch up');
    expect(same(rooms)).toBe(true);
    await host.setProxy('P3', false);

    // ホストが切断 → B がホストに
    a.goOffline();
    await until(() => rb.isHost, 15_000, 'host migration');
    await rb.setProxy('P1', true);
    await until(() => rb.myPlayers().includes('P1'), 5000, 'proxy P1');
    await drive([rb, rc], 30);
    expect(same([rb, rc])).toBe(true);
    for (const r of rooms) r.dispose();
  }, 180_000);

  it('セキュリティルール: 部屋に入っていない人は、部屋の中身を読めない', async () => {
    const [a, x] = await Promise.all([client(), client()]);
    const host = await Room.create(a, { name: 'A', scenarioId: 'corruptionKing', difficulty: 'easy', partySize: 1 });
    await expect(x.get(`rooms/${host.code}/members`)).rejects.toThrow();
    await expect(x.get(`rooms/${host.code}/snapshot`)).rejects.toThrow();
    await expect(x.set(`rooms/${host.code}/log/000000001`, { by: 'x', cmd: '{}' })).rejects.toThrow();
    // 設定（meta）は読める（合言葉で入る前に、部屋があるか確かめるため）
    expect((await x.get<{ code: string }>(`rooms/${host.code}/meta`))?.code).toBe(host.code);
    host.dispose();
  }, 30_000);
});
