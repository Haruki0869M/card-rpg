// ===== オンライン協力の通し確認（テスト用の通信で 2〜4 台をまねる） =====
// 世界マップ → ダンジョン（扉・通路・全員一致）→ 戦闘 → 町 まで、P2 以降の担当の操作で止まらないか。
// 操作は「その操作の担当の端末」からだけ送る（ホストが代わりに送る逃げ道なし）。担当のない操作は端末を順番に替えて送る。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botNextCommand } from '../../engine/bot';
import { commandPlayer, reachable, stateHash } from '../../engine';
import type { GameCommand } from '../../types';
import { MemoryHub } from '../memoryBackend';
import { Room } from '../room';

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
afterEach(() => vi.useRealTimers());
async function settle(n = 12) {
  for (let i = 0; i < n; i++) await vi.advanceTimersByTimeAsync(1);
}

const classes = ['warrior', 'mage', 'guardian', 'hunter'];

async function playing(people: number, seed: number) {
  const hub = new MemoryHub();
  const host = await Room.create(hub.client('u0'), { name: 'ホスト', scenarioId: 'corruptionKing', difficulty: 'easy', partySize: people });
  const rooms = [host];
  for (let i = 1; i < people; i++) rooms.push(await Room.join(hub.client(`u${i}`), host.code, `P${i + 1}`));
  await settle();
  for (let i = 0; i < people; i++) await rooms[i].claimSlot(i, { classId: classes[i], gender: 'male', name: `キャラ${i}` });
  await settle();
  await host.start(seed);
  await settle();
  return rooms;
}

/** 操作の種類（場面の中の操作はほどく） */
const kind = (cmd: GameCommand): string => (cmd.type === 'SCENE' ? kind(cmd.command) : cmd.type === 'BATTLE' ? `BATTLE:${cmd.command.type}` : cmd.type);

describe('オンライン協力の通し確認（担当の端末だけが送る）', () => {
  for (const people of [2, 3, 4]) {
    it(`${people}台: 世界マップ→ダンジョン→戦闘→町を通り、P2以降の担当の操作も通る`, async () => {
      const rooms = await playing(people, 20261108 + people);
      const host = rooms[0];
      const memo = { interacted: new Set<string>() };
      const modes = new Set<string>();
      const kinds = new Set<string>();
      const sentBy = new Map<string, number>();
      let neutral = 0;
      let hurt = false;
      let i = 0;
      for (; i < 3000; i++) {
        const g = host.game!;
        modes.add(`world:${g.mode}`);
        for (const x of g.expeditions ?? []) modes.add(`scene:${x.mode}`);
        if (g.mode === 'ending' || g.mode === 'gameover') break;
        const done = ['world:town', 'scene:dungeon', 'scene:battle', 'world:battle'].every((m) => modes.has(m));
        if (done) break;
        // 自動プレイは HP が半分を切った時だけ町へ行くので、ダンジョンの後に全員の HP を同じように減らして町へ向かわせる
        if (!hurt && modes.has('scene:battle') && g.mode === 'world' && !g.expeditions?.length) {
          hurt = true;
          const next = structuredClone(g);
          for (const h of next.heroes) h.hp = Math.max(1, Math.floor(h.hp / 3));
          for (const r of rooms) Object.assign(r.game!, structuredClone(next));
          await host.backend.set(`rooms/${host.code}/snapshot`, { seq: host.seq, game: JSON.stringify(next), hash: stateHash(next) });
          await settle();
          continue;
        }
        const cmd = botNextCommand(g, memo);
        if (!cmd) throw new Error(`step ${i}: 自動プレイの次の操作が無い（mode=${g.mode}）`);
        const p = commandPlayer(cmd);
        const sender = p ? rooms.find((r) => r.myPlayers().includes(p)) : rooms[neutral++ % rooms.length];
        if (!sender) throw new Error(`step ${i}: ${kind(cmd)} の担当 ${p} の端末が無い`);
        const before = host.seq;
        await sender.send(cmd);
        await settle();
        if (host.seq === before) throw new Error(`step ${i}: ${kind(cmd)}（${p ?? '担当なし'}・${sender.seat}から）が通らない mode=${g.mode}`);
        kinds.add(kind(cmd));
        sentBy.set(sender.seat ?? '?', (sentBy.get(sender.seat ?? '?') ?? 0) + 1);
      }
      const hs = rooms.map((r) => `${r.seq}:${stateHash(r.game)}`);
      console.log(`${people}台 ${i}手`, [...modes].sort().join(' '), '\n  操作', [...kinds].sort().join(' '), '\n  端末ごと', JSON.stringify(Object.fromEntries(sentBy)));
      expect(hs.every((h) => h === hs[0])).toBe(true);
      expect(modes.has('world:town')).toBe(true);
      expect(modes.has('scene:dungeon') || modes.has('world:dungeon')).toBe(true);
      expect(modes.has('scene:battle') || modes.has('world:battle')).toBe(true);
      // P2 以降の端末も操作を送っている
      for (const r of rooms.slice(1)) expect(sentBy.get(r.seat!) ?? 0).toBeGreaterThan(0);
    }, 120_000);
  }
});

// 同行の移動の提案への返事（レビュー資料 2026-11-09）: 画面は返事に同行キャラの heroId を付けて送る。
// オンラインでも、その担当の端末から送った返事で全員が動き、全端末の状態がそろう。
describe('オンライン: P2 の番に担当の違う仲間を連れて動く', () => {
  for (const people of [2, 3, 4]) {
    it(`${people}台: 誘う → 承知 → 移動の提案 → 各担当の端末の「一緒に行く」で全員が動く`, async () => {
      const rooms = await playing(people, 20261109 + people);
      const host = rooms[0];
      const by = (p: string) => rooms.find((r) => r.myPlayers().includes(p as never))!;
      // 物語を閉じて、全員を同じマスに・P2（h1）の番にする
      const next = structuredClone(host.game!);
      const w = next.world!;
      w.story = undefined;
      const start = w.pos.h0;
      for (const h of next.heroes) w.pos[h.id] = start;
      w.turn = 'h1';
      w.acted = ['h0'];
      for (const r of rooms) Object.assign(r.game!, structuredClone(next));
      await host.backend.set(`rooms/${host.code}/snapshot`, { seq: host.seq, game: JSON.stringify(next), hash: stateHash(next) });
      await settle();
      const others = next.heroes.filter((h) => h.id !== 'h1');
      const p2 = by('P2');
      for (const c of others) {
        await p2.send({ type: 'WORLD_INVITE', playerId: 'P2', heroId: 'h1', targetId: c.id });
        await settle();
        await by(c.playerId).send({ type: 'WORLD_INVITE_ANSWER', playerId: c.playerId, heroId: c.id, accept: true });
        await settle();
      }
      await p2.send({ type: 'WORLD_ROLL_MOVE', playerId: 'P2', heroId: 'h1', focusUsed: 4 });
      await settle();
      const g = host.game!;
      const to = [...reachable(g.world!, start, g.world!.move ?? 0).keys()].find((t) => t !== start)!;
      await p2.send({ type: 'WORLD_MOVE', playerId: 'P2', heroId: 'h1', to, companions: others.map((h) => h.id) });
      await settle();
      expect(host.game!.world!.moveProposal?.owners.length).toBe(others.length);
      for (const c of others) {
        await by(c.playerId).send({ type: 'WORLD_MOVE_AGREE', playerId: c.playerId, heroId: c.id, accept: true });
        await settle();
      }
      const end = host.game!.world!;
      expect(end.moveProposal).toBeUndefined();
      expect(end.pos.h1).toBe(to);
      for (const h of host.game!.heroes) expect(end.pos[h.id]).toBe(to);
      const hs = rooms.map((r) => `${r.seq}:${stateHash(r.game)}`);
      expect(hs.every((h) => h === hs[0])).toBe(true);
    }, 60_000);
  }
});
