import { describe, expect, it } from 'vitest';
import { chestLeaveGate, shrineShared, showTurnLock, voteOutsider, worldChestTurnHero } from './worldTurnGate';
import type { GameState, Hero, PlayerId } from '../../types';

// 必要な項目だけの冒険の状態（画面用の判断なので、エンジンは通さない）
const hero = (id: string, playerId: PlayerId): Hero => ({ id, name: id, playerId, hp: 10, retired: false }) as unknown as Hero;
function state(over: Partial<GameState> & { heroes: Hero[] }): GameState {
  return { mode: 'chest', world: { turn: over.heroes[0].id }, chest: { tile: 5, spec: { rarity: 'common', locked: false } }, party: over.heroes.map((h) => h.id), ...over } as unknown as GameState;
}
const onlyP1 = (p: PlayerId) => p === 'P1';
const onlyP2 = (p: PlayerId) => p === 'P2';
const all = () => true;

describe('世界マップの宝箱: だれが押せるか（2026-11-10 の実機の不具合）', () => {
  const eld = hero('eld', 'P1');
  const rina = hero('rina', 'P2');

  it('手番のキャラ: 世界マップのマスの宝箱の時だけ返す', () => {
    expect(worldChestTurnHero(state({ heroes: [eld, rina] }))?.id).toBe('eld');
    expect(worldChestTurnHero(state({ heroes: [eld, rina], activeScene: 'x1' }))).toBeUndefined();
    expect(worldChestTurnHero(state({ heroes: [eld, rina], chest: { spec: { rarity: 'common', locked: false } } as never }))).toBeUndefined();
    expect(worldChestTurnHero(state({ heroes: [eld, rina], world: undefined }))).toBeUndefined();
  });

  it('立ち去る・先へ進む: 手番の担当は押せる。ほかの人は待つ相手が分かる', () => {
    const g = state({ heroes: [eld, rina] });
    expect(chestLeaveGate(g, onlyP1)).toEqual({ canLeave: true });
    const p2 = chestLeaveGate(g, onlyP2);
    expect(p2.canLeave).toBe(false);
    expect(p2.waitFor?.id).toBe('eld');
    expect(p2.waitFor?.playerId).toBe('P1');
  });

  it('1台で遊ぶ時（全員この端末）と、ダンジョンの中の宝箱は、だれでも押せる', () => {
    expect(chestLeaveGate(state({ heroes: [eld, rina] }), all).canLeave).toBe(true);
    expect(chestLeaveGate(state({ heroes: [eld, rina], activeScene: 'x1' }), onlyP2).canLeave).toBe(true);
  });

  it('覆い: 2人以上のプレイヤーがいる宝箱では出さない（開け役は全員で決めるため）', () => {
    const g = state({ heroes: [eld, rina] });
    expect(showTurnLock(g, onlyP2)).toBe(false);
    expect(showTurnLock(g, onlyP1)).toBe(false);
  });

  it('覆い: 自分のキャラがいない宝箱（見ているだけ）と、マスのイベントでは今までどおり出す', () => {
    const solo = state({ heroes: [eld, rina], party: ['eld'] });
    expect(showTurnLock(solo, onlyP2)).toBe(true);
    expect(showTurnLock(solo, onlyP1)).toBe(false);
    const ev = state({ heroes: [eld, rina], mode: 'event', chest: undefined, event: { tile: 3 } as never });
    expect(showTurnLock(ev, onlyP2)).toBe(true);
    expect(showTurnLock({ ...ev, activeScene: 'x1' } as GameState, onlyP2)).toBe(false);
  });
});

describe('祠: 覆い（2026-11-15 の実機の不具合: 同行して入った祠で、P1 の「世界マップへ」が覆いの下に隠れた）', () => {
  const kai = hero('kai', 'P1');
  const lilith = hero('lilith', 'P2');
  const kai2 = hero('kai2', 'P1');
  // 祠の状態（heroId = マスを踏んだキャラ。members = 一緒に入ったキャラ）
  const shrine = (heroes: Hero[], heroId: string, members: string[], extra: Record<string, unknown> = {}) =>
    state({ heroes, mode: 'shrine', chest: undefined, party: members, shrine: { shrineId: 's', tile: 4, heroId, members, ...extra } as never });

  it('1人で入った祠: 今までどおり、踏んだ人でない人に覆いを出す', () => {
    const g = shrine([kai, lilith], 'kai', ['kai']);
    expect(shrineShared(g)).toBe(false);
    expect(showTurnLock(g, onlyP2)).toBe(true);
    expect(showTurnLock(g, onlyP1)).toBe(false);
  });

  it('2人の別々のプレイヤーが一緒に入った祠: どちらの画面にも覆いを出さない（踏んだのがどちらでも）', () => {
    for (const first of ['kai', 'lilith']) {
      const g = shrine([kai, lilith], first, ['kai', 'lilith']);
      expect(shrineShared(g)).toBe(true);
      expect(showTurnLock(g, onlyP1)).toBe(false);
      expect(showTurnLock(g, onlyP2)).toBe(false);
    }
  });

  it('祈った後・片方が先に「世界マップへ」を押した後も、覆いを出さない（残った人が出られる）', () => {
    const prayed = shrine([kai, lilith], 'kai', ['kai', 'lilith'], { result: { optionIndex: 0, text: 'x' }, finished: ['lilith'] });
    expect(showTurnLock(prayed, onlyP1)).toBe(false);
    expect(showTurnLock(prayed, onlyP2)).toBe(false);
  });

  it('1人のプレイヤーが2キャラで入った祠: 今までどおり（ほかの人の画面には覆い）', () => {
    const g = shrine([kai, kai2, lilith], 'kai', ['kai', 'kai2']);
    expect(shrineShared(g)).toBe(false);
    expect(showTurnLock(g, onlyP2)).toBe(true);
    expect(showTurnLock(g, onlyP1)).toBe(false);
  });

  it('1台で2人（全員この端末）: 覆いは出ない', () => {
    expect(showTurnLock(shrine([kai, lilith], 'kai', ['kai', 'lilith']), all)).toBe(false);
    expect(showTurnLock(shrine([kai, lilith], 'kai', ['kai']), all)).toBe(false);
  });

  it('祠でない時（宝箱・イベント）は shrineShared は false', () => {
    expect(shrineShared(state({ heroes: [kai, lilith] }))).toBe(false);
  });
});

describe('2026-11-19: その場面にいない人の票のボタン（押しても票が入らない）', () => {
  const eld = hero('eld', 'P1');
  const rina = hero('rina', 'P2');
  const kai = hero('kai', 'P3');
  const finish = { type: 'FINISH_REWARD', playerId: 'P1' } as const;
  const onlyP3 = (p: PlayerId) => p === 'P3';
  // 世界マップの遭遇の報酬: P1・P2 が戦った（パーティ）。P3 は見ているだけ
  const reward = state({ heroes: [eld, rina, kai], mode: 'reward', chest: undefined, party: ['eld', 'rina'] });

  it('2人で決める報酬の「先へ進む」: 戦っていない P3 の画面は押せない。戦った人は押せる', () => {
    expect(voteOutsider(reward, finish, onlyP3)).toBe(true);
    expect(voteOutsider(reward, finish, onlyP1)).toBe(false);
    expect(voteOutsider(reward, finish, onlyP2)).toBe(false);
  });

  it('1台で遊ぶ時（全員この端末）は、いつも押せる', () => {
    expect(voteOutsider(reward, finish, all)).toBe(false);
  });

  it('1人で決める場面（票にならない）は、今までどおり', () => {
    const solo = state({ heroes: [eld, rina, kai], mode: 'reward', chest: undefined, party: ['eld'] });
    expect(voteOutsider(solo, finish, onlyP3)).toBe(false);
  });

  it('宝箱の開け役「任せる」・「立ち去る」: 宝箱に出ていない人は押せない', () => {
    const chest = state({ heroes: [eld, rina, kai], party: ['eld', 'rina'], activeScene: 'x1' });
    expect(voteOutsider(chest, { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'eld' }, onlyP3)).toBe(true);
    expect(voteOutsider(chest, { type: 'LEAVE_CHEST', playerId: 'P1' }, onlyP3)).toBe(true);
    expect(voteOutsider(chest, { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'eld' }, onlyP2)).toBe(false);
  });

  it('倒れたキャラだけの人は、票に入らない（エンジンの voters と同じ）', () => {
    const down = { ...kai, hp: 0 } as Hero;
    const g = state({ heroes: [eld, rina, down], mode: 'reward', chest: undefined, party: ['eld', 'rina', 'kai'] });
    expect(voteOutsider(g, finish, onlyP3)).toBe(true);
  });
});
