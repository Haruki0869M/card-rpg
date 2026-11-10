import { describe, expect, it } from 'vitest';
import { chestLeaveGate, showTurnLock, worldChestTurnHero } from './worldTurnGate';
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
