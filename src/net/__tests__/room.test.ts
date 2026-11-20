// ===== オンライン協力の部屋（テスト用の通信で、複数の端末をまねる） =====
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botNextCommand } from '../../engine/bot';
import { commandPlayer, createBattle, heroAbilities, stateHash, toPartyMember } from '../../engine';
import { type MemoryClient, MemoryHub } from '../memoryBackend';
import { normalizeCode, OFFLINE_GRACE_MS, Room, RoomError, seqKey, SNAPSHOT_EVERY, watchWake } from '../room';

/** 通知と非同期の処理が落ち着くまで待つ */
// Windowsでは0msタイマーも約15ms待つため、400手分の待機が制限時間を超える。
// 通知の非同期順序は維持し、待ち時間だけを仮想時計で進める。
beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());
async function settle(n = 12) {
  for (let i = 0; i < n; i++) await vi.advanceTimersByTimeAsync(1);
}
/** 部屋の時計とタイマーを ms 進める（「動いている」の書き込みは本物の時計なので、部屋の時計だけずらす） */
async function passTime(hub: MemoryHub, ms: number) {
  const prev = hub.clock;
  hub.clock = () => prev() + ms;
  await vi.advanceTimersByTimeAsync(ms);
  await settle(30);
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

/** 同期確認用に同じ戦闘を全端末と保存点へ載せる。 */
async function specialBattle(roles: string[]) {
  const session = await playing(roles.length);
  const game = structuredClone(session.host.game!);
  game.heroes.forEach((h, i) => h.classId = roles[i]);
  game.mode = 'battle'; game.party = game.heroes.map(h => h.id);
  game.battle = createBattle({ seed: 93, readyCheck: true, party: game.heroes.map(toPartyMember), encounter: { id: 'netSpecial', name: '同期確認', enemies: [{ defId: 'forestWolf' }] } });
  game.battle.enemies[0].hp = game.battle.enemies[0].maxHp = 10000;
  for (const a of game.battle.allies) { a.mana = 20; a.focus = 0; }
  for (const r of session.rooms) Object.assign(r.game!, structuredClone(game));
  await session.host.backend.set(`rooms/${session.host.code}/snapshot`, { seq: session.host.seq, game: JSON.stringify(game), hash: stateHash(game) });
  await settle();
  return session;
}

describe('毛色抽選の通信と再接続', () => {
  it('P2の出会いで毛色を全員へ共有し、再接続後も同じ色で採用できる', async () => {
    const { hub, host, rooms } = await playing(2);
    const g = structuredClone(host.game!);
    g.world!.story = undefined; g.world!.turn = 'h1'; g.mode = 'event'; g.party = ['h1']; g.heroes[1].gold = 200;
    g.event = { eventId: 'rStrayBird', tile: g.world!.pos.h1, random: true };
    for (const r of rooms) Object.assign(r.game!, structuredClone(g));
    await host.backend.set(`rooms/${host.code}/snapshot`, { seq: host.seq, game: JSON.stringify(g), hash: stateHash(g) }); await settle();
    await rooms[1].send({ type: 'CHOOSE_EVENT', playerId: 'P2', optionIndex: 2, focusUsed: 0 }); await settle();
    expect(allSame(rooms)).toBe(true);
    const offered = host.game!.heroes[1], petId = offered.petOffer![0], color = offered.petOfferColors![petId], rng = host.game!.rngState;
    expect(color).toBeTruthy();
    await rooms[1].send({ type: 'FINISH_EVENT', playerId: 'P2' }); await settle();
    await host.backend.set(`rooms/${host.code}/snapshot`, { seq: host.seq, game: JSON.stringify(host.game), hash: stateHash(host.game) }); await settle();
    const old = rooms[1]; old.backend.goOffline(); await settle();
    rooms[1] = await Room.join(hub.client('u1'), host.code, 'P2'); await settle();
    expect(rooms[1].game!.heroes[1].petOfferColors![petId]).toBe(color);
    await rooms[1].send({ type: 'ADOPT_PET', playerId: 'P2', heroId: 'h1', petId, name: 'ピコ' }); await settle();
    expect(allSame(rooms)).toBe(true); expect(host.game!.heroes[1].pet).toMatchObject({ petId, color, name: 'ピコ' });
    expect(host.game!.rngState).toBe(rng);
    for (const r of [...rooms, old]) await r.leave();
  });
});

describe('特殊職の通信と再接続', () => {
  it('2端末へ現職・引き継ぎ・お供の同じ発動通知を配り、戦闘結果も一致する', async () => {
    const { rooms } = await specialBattle(['swordSaint', 'warrior']);
    const notifications: unknown[][] = [[], []];
    rooms.forEach((r, i) => {
      const h = r.game!.heroes[0]; h.carried = 'swordmaster'; h.pet = { petId: 'blackCat', color: 'black', name: 'ルナ', love: 0, acts: 0 };
      const a = r.game!.battle!.allies[0]; a.abilities = heroAbilities(h); a.pet = h.pet; a.hand = [{ uid: 's', cardId: 'strike' }]; a.focus = 6;
      r.on(e => { if (e.type === 'command') notifications[i].push(e.result.battleEvents); });
    });
    await rooms[0].send({ type: 'BATTLE', command: { type: 'PLAY_CARD', playerId: 'P1', characterId: 'h0', cardInstanceId: 's', targetId: 'e0', focusUsed: 1 } }); await settle();
    expect(allSame(rooms)).toBe(true); expect(notifications[0]).toEqual(notifications[1]);
    const text = JSON.stringify(notifications[0]); expect(text).toContain('"kind":"job"'); expect(text).toContain('"kind":"inherited"'); expect(text).toContain('"kind":"pet"');
    for (const r of rooms) await r.leave();
  });

  it('P1の歌がP2〜P4へ届き、P2のカード使用でP2の応援だけ消える', async () => {
    const { rooms } = await specialBattle(['bard', 'warrior', 'mage', 'hunter']);
    for (const r of rooms) {
      r.game!.battle!.allies[0].hand = [{ uid: 'song', cardId: 'bardCourage' }];
      r.game!.battle!.allies[1].hand = [{ uid: 'attack', cardId: 'cmArcaneArrow' }];
    }
    await rooms[0].send({ type: 'BATTLE', command: { type: 'PLAY_CARD', playerId: 'P1', characterId: 'h0', cardInstanceId: 'song', focusUsed: 0 } }); await settle();
    expect(allSame(rooms)).toBe(true); expect(rooms[3].game!.battle!.allies.map(a => a.statuses.songInspired)).toEqual([1, 1, 1, 1]);
    await rooms[1].send({ type: 'BATTLE', command: { type: 'PLAY_CARD', playerId: 'P2', characterId: 'h1', cardInstanceId: 'attack', targetId: rooms[1].game!.battle!.enemies[0].uid, focusUsed: 0 } }); await settle();
    expect(allSame(rooms)).toBe(true); expect(rooms[0].game!.battle!.allies.map(a => a.statuses.songInspired)).toEqual([1, 0, 1, 1]);
    for (const r of rooms) await r.leave();
  });
  it('P2の星読みを全端末が共有し、結果確認中の再接続でも予約・乱数が一致する', async () => {
    const { hub, host, rooms } = await specialBattle(['warrior', 'astrologer']);
    for (const r of rooms) r.game!.battle!.allies[1].hand = [{ uid: 'star', cardId: 'cmArcaneArrow' }];
    await rooms[1].send({ type: 'BATTLE', command: { type: 'PREVIEW_CARD', playerId: 'P2', characterId: 'h1', cardInstanceId: 'star', targetId: host.game!.battle!.enemies[0].uid, focusUsed: 0 } }); await settle();
    expect(allSame(rooms)).toBe(true); const preview = structuredClone(host.game!.battle!.slotPreview), rng = host.game!.battle!.rngState, seq = host.seq;
    await rooms[0].send({ type: 'BATTLE', command: { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: 'h1' } }); await settle();
    expect(host.seq).toBe(seq); expect(host.game!.battle!.slotPreview).toEqual(preview);
    await host.backend.set(`rooms/${host.code}/snapshot`, { seq: host.seq, game: JSON.stringify(host.game), hash: stateHash(host.game) }); await settle();
    rooms[1].backend.goOffline(); await settle();
    const again = await Room.join(hub.client('u1'), host.code, 'P2再接続'); await settle();
    expect(again.game!.battle!.slotPreview).toEqual(preview); expect(again.game!.battle!.rngState).toBe(rng);
    await again.send({ type: 'BATTLE', command: { type: 'REROLL_PREVIEW', playerId: 'P2', characterId: 'h1' } }); await settle();
    expect(host.game!.battle!.slotPreview?.rerolled).toBe(true); expect(host.game!.battle!.rngState).toBe(rng);
    await again.send({ type: 'BATTLE', command: { type: 'CONFIRM_PREVIEW', playerId: 'P2', characterId: 'h1' } }); await settle();
    expect(host.game!.battle!.slotPreview).toBeUndefined(); expect(stateHash(host.game)).toBe(stateHash(again.game));
    for (const r of [...rooms, again]) await r.leave();
  });
});

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
  it('人数を変えると、全員の画面の枠の数がすぐ変わる（増やした時も。M3-C6）', async () => {
    const hub = new MemoryHub();
    const host = await Room.create(hub.client('u0'), { name: 'A', scenarioId: 'corruptionKing', difficulty: 'normal', partySize: 2 });
    const b = await Room.join(hub.client('u1'), host.code, 'B');
    await host.claimSlot(0, { classId: 'warrior', gender: 'male', name: 'レオン' });
    await settle();
    await host.updateSettings({ partySize: 4 });
    await settle();
    expect(host.slots).toHaveLength(4);
    expect(b.slots).toHaveLength(4);
    expect(b.slots[0]?.name).toBe('レオン');
    await host.updateSettings({ partySize: 1 });
    await settle();
    expect(b.slots).toHaveLength(1);
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
    await b.send({ type: 'WORLD_ROLL_MOVE', playerId: 'P2', heroId: h0.id });
    await settle();
    expect(host.seq).toBe(0);
    expect(got.length).toBe(1);
  });

  it('ずれた端末は、次の状態の保存の時に気づいて取り直す', async () => {
    const { rooms } = await playing(2);
    await drive(rooms, 3);
    // b の状態をわざと壊す
    rooms[1].game!.heroes[0].gold += 999;
    const reasons: string[] = [];
    rooms[1].on((e) => e.type === 'resync' && reasons.push(e.reason));
    await drive(rooms, SNAPSHOT_EVERY + 5);
    expect(reasons).toContain('hash');
    expect(allSame(rooms)).toBe(true);
  }, 30_000);
});

describe('切断と再接続・ホストの引き継ぎ', () => {
  it('切断した端末は、つながり直すと追いつく（古い記録が消えていたら保存から取り直す）', async () => {
    const { hub, rooms } = await playing(3, 3);
    await drive(rooms, 5);
    const c = rooms[2];
    c.backend.goOffline();
    await settle();
    expect(rooms[0].members[c.uid].online).toBe(false);
    // 実機の不具合③: 切れてから約10秒は「動いている」扱い（一瞬の切断では知らせない）。10秒たつと切れている
    expect(rooms[0].seatOnline('P3')).toBe(true);
    await passTime(hub, OFFLINE_GRACE_MS + 1_000);
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

  it('ホストが切断したら、約10秒後に次に入った人がホストになり、そのまま続けられる', async () => {
    const { hub, rooms } = await playing(3, 3);
    await drive(rooms, 8);
    const [host, b, c] = rooms;
    host.backend.goOffline();
    await settle(30);
    // 実機の不具合③（点検 F3）: ふつうの切断は、すぐには引き継がない（一瞬の切断かもしれない）
    expect(b.isHost).toBe(false);
    await passTime(hub, OFFLINE_GRACE_MS + 1_000);
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

  it('回3 C: ホストのページが止まった（接続は残ったまま）時も、「動いている」が古くなったら次の人が引き継ぎ、そのまま続けられる', async () => {
    const { hub, rooms } = await playing(2, 2);
    await drive(rooms, 6);
    const [host, b] = rooms;
    type Inside = { beatTimer: ReturnType<typeof setInterval> | null; stopHosting(): void; checkHost(): void; startBeat(): void };
    const h = host as unknown as Inside;
    // スマホが眠った: タイマーも処理も止まる。接続（online）は残る
    if (h.beatTimer) clearInterval(h.beatTimer);
    h.beatTimer = null;
    h.stopHosting();
    expect(hub.read(`rooms/${host.code}/members/u0/online`)).toBe(true);
    // まだ新しいうちは引き継がない
    (b as unknown as Inside).checkHost();
    await settle(30);
    expect(b.isHost).toBe(false);
    // 時間がたって、ホストの「動いている」が古くなった
    const t0 = Date.now();
    hub.clock = () => Date.now() - t0 + t0 + 40_000;
    expect(b.seatOnline('P1')).toBe(false);
    (b as unknown as Inside).checkHost();
    await settle(30);
    expect(b.isHost).toBe(true);
    await b.setProxy('P1', true);
    await settle();
    const before = b.seq;
    await drive([b], 12);
    expect(b.seq).toBeGreaterThan(before);
    // 目を覚ました: ホストは戻らず、記録に追いつく（新しいホストは、その間も「動いている」を書き続けている）
    await b.backend.set(`rooms/${b.code}/members/u1/beat`, hub.clock());
    await settle();
    h.startBeat();
    await settle(30);
    expect(host.isHost).toBe(false);
    expect(allSame(rooms)).toBe(true);
    expect(b.seatOnline('P1')).toBe(true);
  }, 30_000);

  describe('ホストの引き継ぎの直し（2026-11-14）: 目を覚ました古いホストが、古い状態で記録を書かない', () => {
    type Inside = {
      beatTimer: ReturnType<typeof setInterval> | null;
      stopHosting(): void;
      checkHost(): void;
      startBeat(): void;
      queue: { key: string; by: string; cmd: string }[];
      processQueue(): Promise<void>;
      handleRequest(req: { key: string; by: string; cmd: string }): Promise<'retry' | void>;
      reqSub: unknown;
    };
    /** ホストのページが凍り、相方が引き継いで steps 手進める。古いホストは、まだ自分がホストだと思っている */
    async function frozenOldHost(steps: number) {
      const { hub, rooms } = await playing(2, 2);
      await drive(rooms, 6);
      const [host, b] = rooms;
      const h = host as unknown as Inside;
      if (h.beatTimer) clearInterval(h.beatTimer);
      h.beatTimer = null;
      (host.backend as MemoryClient).paused = true;
      const t0 = Date.now();
      hub.clock = () => Date.now() - t0 + t0 + 40_000;
      (b as unknown as Inside).checkHost();
      await settle(30);
      expect(b.isHost).toBe(true);
      await b.setProxy('P1', true);
      await settle();
      await drive([b], steps);
      // 古いホストの頭の中は、凍った時のまま
      expect(host.isHost).toBe(true);
      expect(host.seq).toBeLessThan(b.seq);
      const log = () => JSON.stringify(hub.read(`rooms/${host.code}/log`));
      return { hub, host, b, h, log };
    }
    /** 古いホストの状態で通る操作を、部屋の依頼として置く（目を覚ました時に、たまっていた依頼として届く物） */
    async function staleRequest(host: Room, hub: MemoryHub, key: string) {
      const cmd = botNextCommand(host.game!, { interacted: new Set<string>() })!;
      const req = { by: host.uid, cmd: JSON.stringify(cmd) };
      hub.write(`rooms/${host.code}/requests/${key}`, req);
      return { key, ...req };
    }

    it('目を覚ました古いホストは、部屋のホストを読み直して、依頼を処理しない（記録は変わらない）', async () => {
      const { hub, host, b, h, log } = await frozenOldHost(12);
      const before = log();
      const req = await staleRequest(host, hub, 'zzzz-stale-1');
      h.queue.push(req);
      await h.processQueue();
      expect(log()).toBe(before);
      expect(h.reqSub).toBeNull();
      // 目を覚ますと、新しいホストに合わせて追いつく。新しいホストが依頼を処理する
      (host.backend as MemoryClient).paused = false;
      await settle(30);
      expect(host.isHost).toBe(false);
      expect(b.isHost).toBe(true);
      expect(allSame([host, b])).toBe(true);
    }, 30_000);

    it('ホストの確かめをすり抜けても、もう書かれた番号は上書きしない（transaction）', async () => {
      const { hub, host, b, h, log } = await frozenOldHost(12);
      const before = log();
      const n = host.seq + 1;
      const theirs = JSON.stringify(hub.read(`rooms/${host.code}/log/${seqKey(n)}`));
      expect(theirs).not.toBe('null');
      const req = await staleRequest(host, hub, 'zzzz-stale-2');
      expect(await h.handleRequest(req)).toBe('retry');
      expect(JSON.stringify(hub.read(`rooms/${host.code}/log/${seqKey(n)}`))).toBe(theirs);
      expect(log()).toBe(before);
      (host.backend as MemoryClient).paused = false;
      await settle(30);
      expect(allSame([host, b])).toBe(true);
    }, 30_000);

    it('古い状態で断らない: 次の番号の記録がもうあれば、エラーを書かずにやり直しにする', async () => {
      const { hub, host, h } = await frozenOldHost(12);
      const req = { key: 'zzzz-stale-3', by: 'u1', cmd: JSON.stringify({ type: 'ENTER_ROOM', playerId: 'P1', roomId: 'no-such-room' }) };
      hub.write(`rooms/${host.code}/requests/${req.key}`, { by: req.by, cmd: req.cmd });
      expect(await h.handleRequest(req)).toBe('retry');
      expect(hub.read(`rooms/${host.code}/errors/u1`)).toBeNull();
      expect(hub.read(`rooms/${host.code}/requests/${req.key}`)).not.toBeNull();
    }, 30_000);

    it('同じ依頼は二重に記録しない（新しいホストが記録した依頼が、古いホストにも届いた時）', async () => {
      const { hub, host, b, h, log } = await frozenOldHost(4);
      (host.backend as MemoryClient).paused = false;
      await settle(30);
      expect(allSame([host, b])).toBe(true);
      // 新しいホストが処理した依頼のキー（記録に入っている）
      const entries = hub.read(`rooms/${host.code}/log`) as Record<string, { req?: string; by: string; cmd: string }>;
      const last = entries[seqKey(b.seq)];
      expect(last.req).toBeTruthy();
      const before = log();
      // 古いホストが、まだホストだと思ったまま、同じ依頼を受け取った
      expect(await h.handleRequest({ key: last.req!, by: last.by, cmd: last.cmd })).toBeUndefined();
      expect(log()).toBe(before);
      expect(allSame([host, b])).toBe(true);
    }, 30_000);
  });

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

describe('実機の不具合③: 「通信が切れています」が何度も出る（接続の印・待ち・ホストの引き継ぎ）', () => {
  type Inside = { fixMyMark(): void; checkHost(): void };
  const online = (hub: MemoryHub, r: Room, uid: string) => hub.read(`rooms/${r.code}/members/${uid}/online`);

  for (const people of [2, 3, 4]) {
    it(`${people}人: 動いている端末の印が後から false と書かれても、自分ですぐ true に書き直す（知らせは出ない）`, async () => {
      const { hub, rooms } = await playing(people);
      await drive(rooms, 3);
      const last = rooms[people - 1];
      const seat = last.seat!;
      // サーバーが古い接続の切断に後から気づいて false を書いた（スマホの電波の切り替え）
      hub.write(`rooms/${last.code}/members/${last.uid}/online`, false);
      await settle(30);
      expect(online(hub, last, last.uid)).toBe(true);
      expect(hub.read(`rooms/${last.code}/members/${last.uid}/beat`)).toBeGreaterThan(0);
      await passTime(hub, OFFLINE_GRACE_MS + 1_000);
      for (const r of rooms) expect(r.seatOnline(seat)).toBe(true);
    }, 30_000);

    it(`${people}人: 動いているホストは、印が false と書かれても引き継がれない`, async () => {
      const { hub, rooms } = await playing(people);
      await drive(rooms, 3);
      const [host] = rooms;
      hub.write(`rooms/${host.code}/members/${host.uid}/online`, false);
      await settle(30);
      await passTime(hub, OFFLINE_GRACE_MS + 1_000);
      for (const r of rooms.slice(1)) (r as unknown as Inside).checkHost();
      await settle(30);
      expect(host.isHost).toBe(true);
      for (const r of rooms.slice(1)) expect(r.isHost).toBe(false);
      expect(online(hub, host, host.uid)).toBe(true);
    }, 30_000);

    it(`${people}人: ホストが「部屋を出る」と、待たずにすぐ次の人が引き継ぐ`, async () => {
      const { rooms } = await playing(people);
      await drive(rooms, 3);
      const [host, b] = rooms;
      await host.leave();
      await settle(30);
      expect(b.isHost).toBe(true);
      expect(b.seatOnline('P1')).toBe(false);
    }, 30_000);

    it(`${people}人: ホストがふつうに切れると、約10秒は待ってから引き継ぐ。戻るとホストは代わらず追いつく`, async () => {
      const { hub, rooms } = await playing(people);
      await drive(rooms, 3);
      const [host, b] = rooms;
      host.backend.goOffline();
      await settle(30);
      await passTime(hub, OFFLINE_GRACE_MS / 2);
      (b as unknown as Inside).checkHost();
      await settle(30);
      expect(b.isHost).toBe(false);
      await passTime(hub, OFFLINE_GRACE_MS / 2 + 1_000);
      expect(b.isHost).toBe(true);
      for (const r of rooms.slice(2)) expect(r.isHost).toBe(false);
      host.backend.goOnline();
      await settle(30);
      expect(host.isHost).toBe(false);
      expect(allSame(rooms)).toBe(true);
    }, 30_000);
  }

  it('ホストが一瞬だけ切れて戻ると、引き継がれず、知らせも出ない', async () => {
    const { hub, rooms } = await playing(2);
    await drive(rooms, 3);
    const [host, b] = rooms;
    host.backend.goOffline();
    await settle(30);
    expect(b.seatOnline('P1')).toBe(true);
    await passTime(hub, 3_000);
    host.backend.goOnline();
    await settle(30);
    await passTime(hub, OFFLINE_GRACE_MS);
    expect(b.isHost).toBe(false);
    expect(host.isHost).toBe(true);
    expect(b.seatOnline('P1')).toBe(true);
  }, 30_000);

  it('知らせの待ち: 切れてから約10秒で「切れている」になり、画面へ知らせる。戻るとすぐ消える', async () => {
    const { hub, rooms } = await playing(2);
    const [host, b] = rooms;
    let members = 0;
    host.on((e) => e.type === 'members' && members++);
    b.backend.goOffline();
    await settle(30);
    expect(host.seatOnline('P2')).toBe(true);
    const before = members;
    await passTime(hub, OFFLINE_GRACE_MS + 100);
    expect(host.seatOnline('P2')).toBe(false);
    expect(members).toBeGreaterThan(before);
    b.backend.goOnline();
    await settle(30);
    expect(host.seatOnline('P2')).toBe(true);
  }, 30_000);

  it('知らせが出ている間に相手の操作が届いたら、すぐ「動いている」に戻る', async () => {
    const { hub, rooms } = await playing(2);
    const [host, b] = rooms;
    // 相手の印だけが false のまま残った形を作る（書き直しを止める）
    (b as unknown as Inside).fixMyMark = () => {};
    hub.write(`rooms/${b.code}/members/${b.uid}/online`, false);
    await settle(30);
    await passTime(hub, OFFLINE_GRACE_MS + 100);
    expect(host.seatOnline('P2')).toBe(false);
    const seen: boolean[] = [];
    host.on((e) => e.type === 'command' && e.by === b.uid && seen.push(host.seatOnline('P2')));
    await drive(rooms, 40);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every(Boolean)).toBe(true);
  }, 30_000);

  it('画面が戻った時（wake）: すぐ「動いている」を書き、記録が先へ進んでいたら取り直す', async () => {
    const { hub, rooms } = await playing(2);
    const [host, b] = rooms;
    await drive(rooms, 3);
    // 相方のページが裏に回った: 知らせが届かない。その間ホストが代わりに進める
    (b.backend as MemoryClient).paused = true;
    await host.setProxy('P2', true);
    await settle();
    await drive([host], 5);
    expect(b.seq).toBeLessThan(host.seq);
    const reasons: string[] = [];
    b.on((e) => e.type === 'resync' && reasons.push(e.reason));
    await passTime(hub, 3_000);
    const beatBefore = hub.read(`rooms/${b.code}/members/${b.uid}/beat`) as number;
    b.wake();
    await settle(5);
    expect(hub.read(`rooms/${b.code}/members/${b.uid}/beat`)).toBeGreaterThan(beatBefore);
    await vi.advanceTimersByTimeAsync(2_000);
    await settle(30);
    expect(reasons).toContain('gap');
    (b.backend as MemoryClient).paused = false;
    await settle(30);
    expect(allSame(rooms)).toBe(true);
  }, 30_000);

  it('watchWake: タブが表に戻った・ネットが戻った・ページが戻った時に呼ぶ（裏に回った時は呼ばない）', () => {
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { visibilityState: 'hidden' as DocumentVisibilityState });
    let n = 0;
    const stop = watchWake(() => n++, win as unknown as Window, doc as unknown as Document);
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(n).toBe(0);
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('online'));
    win.dispatchEvent(new Event('pageshow'));
    expect(n).toBe(3);
    stop();
    win.dispatchEvent(new Event('online'));
    expect(n).toBe(3);
  });
});
