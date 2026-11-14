// 実機の不具合②⑥（2026-11-14）: つながり直してもシートが残る・持ち物の「使う・渡す」の命令が正しい席から出る・受け取った側の知らせ
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyGameCommand, createGame } from '../engine';
import type { Room } from '../net/room';
import type { GameCommand, GameState, PlayerId } from '../types';
import { giveCommand } from '../components/sheetItems';
import { setLocalPlayers } from './battleConfig';
import { setStoreRoom, useBattle } from './battleStore';
import { receiveNotice } from './presentation';

vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
});

afterEach(() => {
  setStoreRoom(null);
  setLocalPlayers(null);
  useBattle.getState().abandonGame();
});

/** 2人（P1 = 仲間0・P2 = 仲間1）が同じマスにいる世界マップ。仲間1が回復薬（x1）を持つ */
function twoOnTile(): GameState {
  const g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: (['P1', 'P2'] as PlayerId[]).map((playerId, i) => ({ playerId, classId: 'warrior', gender: 'male' as const, name: `仲間${i}` })) });
  const w = g.world!;
  w.story = undefined;
  for (const h of g.heroes) {
    w.pos[h.id] = w.pos.h0;
    h.lastRandomEvent = w.worldTurn;
    h.pouch = [];
    h.gold = 30;
  }
  g.heroes[1].pouch.push({ uid: 'x1', itemId: 'potion' });
  g.heroes[0].hp = Math.max(1, g.heroes[0].hp - 25);
  return g;
}

/** 部屋の代わり（送った命令を覚えるだけ） */
function fakeRoom(sent: GameCommand[]): Room {
  return { send: (c: GameCommand) => { sent.push(c); return Promise.resolve(); }, seatName: () => undefined, connected: true } as unknown as Room;
}
const st = () => useBattle.getState();
const innerOf = (w: GameCommand): GameCommand => (w.type === 'SCENE' ? innerOf(w.command) : w);

describe('つながり直した時のシート（点検 F6）', () => {
  it('取り直してもシートは開いたまま。シートの中の選択を消す合図（sheetEpoch）が進む', () => {
    st().loadRemote(twoOnTile());
    st().openSheet('party', 'h1');
    const epoch = st().sheetEpoch;
    st().loadRemote(twoOnTile());
    expect(st().sheet).toBe('party');
    expect(st().sheetHeroId).toBe('h1');
    expect(st().sheetEpoch).toBe(epoch + 1);
  });
  it('取り直しで品物が消えても、シートの状態は落ちない（品物は選ばれていない扱い。sheetItems の liveRow）', () => {
    st().loadRemote(twoOnTile());
    st().openSheet('pouch');
    const g = twoOnTile();
    g.heroes[1].pouch = [];
    st().loadRemote(g);
    expect(st().sheet).toBe('pouch');
    expect(st().full!.heroes[1].pouch).toEqual([]);
  });
  it('冒険の画面に初めて入る時（待合室から）は、シートを開いたまま入らない', () => {
    st().setScreen('lobby');
    useBattle.setState({ sheet: 'menu' });
    st().loadRemote(twoOnTile());
    expect(st().screen).toBe('game');
    expect(st().sheet).toBeNull();
  });
});

describe('持ち物の「渡す」の命令の席（CLAUDE.md §7: actorOf）', () => {
  it('1台で2人: 画面が P1 として送っても、渡すキャラの担当（P2）の命令になる', () => {
    st().loadRemote(twoOnTile());
    const hero = st().game!.heroes[1];
    expect(st().dispatchGame({ ...giveCommand(hero, 'h0', { itemUid: 'x1' }), playerId: 'P1' } as GameCommand)).toBeUndefined();
    expect(st().full!.heroes[0].pouch.map((p) => p.uid)).toEqual(['x1']);
    expect(st().full!.heroes[1].pouch).toEqual([]);
  });
  it('オンライン（この端末は P2）: P2 の席から送る。P1 のキャラの物は渡せない', () => {
    const sent: GameCommand[] = [];
    setLocalPlayers(['P2']);
    setStoreRoom(fakeRoom(sent));
    st().loadRemote(twoOnTile());
    const [h0, h1] = st().game!.heroes;
    expect(st().dispatchGame(giveCommand(h1, 'h0', { gold: 10 }))).toBeUndefined();
    expect(innerOf(sent[0])).toMatchObject({ type: 'GIVE', playerId: 'P2', fromHeroId: 'h1', toHeroId: 'h0', gold: 10 });
    expect(st().dispatchGame(giveCommand(h0, 'h1', { gold: 10 }))).toMatch(/P1の担当/);
    expect(sent.length).toBe(1);
  });
  it('ホストが P2 の代わりに操作: P2 のキャラの物は P2 の席から送る', () => {
    const sent: GameCommand[] = [];
    setLocalPlayers(['P1', 'P2']);
    setStoreRoom(fakeRoom(sent));
    st().loadRemote(twoOnTile());
    expect(st().dispatchGame(giveCommand(st().game!.heroes[1], 'h0', { itemUid: 'x1' }))).toBeUndefined();
    expect(innerOf(sent[0])).toMatchObject({ type: 'GIVE', playerId: 'P2', fromHeroId: 'h1', itemUid: 'x1' });
  });
  it('「使う」も道具袋と同じ命令（USE_POUCH_ITEM）で、袋の持ち主の席から出る。パーティのシートからはシートを閉じない', () => {
    const sent: GameCommand[] = [];
    setLocalPlayers(['P2']);
    setStoreRoom(fakeRoom(sent));
    st().loadRemote(twoOnTile());
    st().openSheet('party');
    expect(st().usePouch('x1', 'h0', 'h1', undefined, undefined, true)).toBeUndefined();
    expect(innerOf(sent[0])).toMatchObject({ type: 'USE_POUCH_ITEM', playerId: 'P2', userId: 'h1', targetId: 'h0', itemUid: 'x1' });
    expect(st().sheet).toBe('party');
    expect(st().toast?.text).toBe('仲間0に回復薬を使いました');
  });
  it('道具袋のシートから使った時は、今までどおりシートを閉じる', () => {
    st().loadRemote(twoOnTile());
    st().openSheet('pouch');
    expect(st().usePouch('x1', 'h0', 'h1')).toBeUndefined();
    expect(st().sheet).toBeNull();
    expect(st().full!.heroes[1].pouch).toEqual([]);
  });
});

describe('受け取った側の知らせ（実機の不具合⑥）', () => {
  const p1 = (p: PlayerId) => p === 'P1';
  it('関数: 仲間が渡した物・ゴールドが、この端末のキャラに届いた時だけ文を出す', () => {
    const g = twoOnTile();
    const item = giveCommand(g.heroes[1], 'h0', { itemUid: 'x1' });
    const after = applyGameCommand(g, item).state;
    expect(receiveNotice(g, after, item, p1)).toBe('仲間1から回復薬を受け取りました');
    const gold = giveCommand(g.heroes[1], 'h0', { gold: 10 });
    expect(receiveNotice(g, applyGameCommand(g, gold).state, gold, p1)).toBe('仲間1から10Gを受け取りました');
    // 渡した側の端末（P2）には出さない（渡した側は「〜に渡しました」を画面が出す）
    expect(receiveNotice(g, after, item, (p) => p === 'P2')).toBeNull();
    // 1台で全員を動かす時も出さない
    expect(receiveNotice(g, after, item, () => true)).toBeNull();
    // 失敗して何も届いていない時は出さない
    expect(receiveNotice(g, g, item, p1)).toBeNull();
  });
  it('ストア: 部屋から届いた「渡す」で、受け取った P1 の画面に知らせが出る', () => {
    setLocalPlayers(['P1']);
    setStoreRoom(fakeRoom([]));
    const g = twoOnTile();
    st().loadRemote(g);
    const wire = giveCommand(g.heroes[1], 'h0', { itemUid: 'x1' });
    st().applyRemote(applyGameCommand(st().full!, wire), wire);
    expect(st().toast?.text).toBe('仲間1から回復薬を受け取りました');
  });
});
