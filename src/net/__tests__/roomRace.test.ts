// 同時押し（賢い検証 bot の揺さぶり S13 が見つけた所）: ホストが依頼の一覧を読み直している間に届いた依頼を、捨てない
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botNextCommand } from '../../engine/bot';
import { MemoryHub } from '../memoryBackend';
import { Room } from '../room';

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());
async function settle(n = 12) {
  for (let i = 0; i < n; i++) await vi.advanceTimersByTimeAsync(1);
}

describe('同時押し: 読み直しの間に届いた依頼', () => {
  it('ホストが依頼の一覧を読んだ直後に届いた P2 の依頼も、処理される（捨てられて残らない）', async () => {
    const hub = new MemoryHub();
    const hostClient = hub.client('u0');
    const host = await Room.create(hostClient, { name: 'ホスト', scenarioId: 'corruptionKing', difficulty: 'easy', partySize: 2 });
    const b = await Room.join(hub.client('u1'), host.code, 'P2');
    await settle();
    await host.claimSlot(0, { classId: 'warrior', gender: 'male', name: 'キャラ0' });
    await b.claimSlot(1, { classId: 'mage', gender: 'male', name: 'キャラ1' });
    await settle();
    await host.start(7);
    await settle();

    const got: string[] = [];
    b.on((e) => e.type === 'rejected' && got.push(e.text));
    // ホストの「依頼の一覧の読み直し」が返る前（= 読んだ後）に、P2 の依頼が届く形を作る
    const orig = hostClient.get.bind(hostClient);
    let once = true;
    hostClient.get = (async (path: string) => {
      const v = await orig(path);
      if (once && path.endsWith('/requests')) {
        once = false;
        // P2 の依頼（担当でないキャラの操作 = 断られて理由が届くはず）
        await b.send({ type: 'WORLD_ROLL_MOVE', playerId: 'P2', heroId: host.game!.heroes[0].id });
        await settle();
      }
      return v;
    }) as typeof hostClient.get;

    const cmd = botNextCommand(host.game!, { interacted: new Set<string>() })!;
    await host.send(cmd);
    await settle(40);

    expect(host.seq).toBe(1); // ホストの操作は入った
    expect(got.length).toBe(1); // P2 の依頼も処理された（断りの理由が届いた）
    expect(hub.read(`rooms/${host.code}/requests`)).toBeNull(); // 依頼が残っていない
  });
});
