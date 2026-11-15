import { beforeEach, describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { useDetail } from '../../hooks/usePress';
import type { BattleState, GameState } from '../../types';
import { useStatusList } from '../battle/StatusListPopup';
import { viewKey, watchViewChange } from './localWindows';

type View = { screen: string; scene: string; game: GameState | null; battle: BattleState };

const battle = (over: Partial<BattleState> = {}) => ({ encounterId: 'wolves', seed: 1, phase: 'ally', ...over }) as BattleState;
const game = (mode: string) => ({ mode }) as GameState;
const start: View = { screen: 'game', scene: 'world', game: game('battle'), battle: battle() };

/** 本物の store と同じ形（getState・subscribe）の小さな入れ物 */
function fakeStore() {
  return create<View>(() => ({ ...start }));
}

describe('この端末だけの窓を、画面が変わった時に閉じる（公開前の点検 B1）', () => {
  beforeEach(() => {
    useStatusList.getState().hide();
    useDetail.getState().hide();
  });

  it('戦闘の途中（手番が進む・敵の番）は印が変わらない。終わる・別の戦闘・別の画面で変わる', () => {
    const k = viewKey(start);
    expect(viewKey({ ...start, battle: battle({ phase: 'enemy', turn: 3 }) })).toBe(k);
    expect(viewKey({ ...start, battle: battle({ phase: 'victory' }) })).not.toBe(k);
    expect(viewKey({ ...start, battle: battle({ phase: 'defeat' }) })).not.toBe(k);
    expect(viewKey({ ...start, battle: battle({ phase: 'escaped' }) })).not.toBe(k);
    expect(viewKey({ ...start, battle: battle({ seed: 2 }) })).not.toBe(k);
    expect(viewKey({ ...start, game: game('reward') })).not.toBe(k);
    expect(viewKey({ ...start, scene: 'exp-1' })).not.toBe(k);
    expect(viewKey({ ...start, screen: 'title' })).not.toBe(k);
  });

  it('味方の「＋N」の一覧を開いたまま戦闘に勝つと閉じ、次の戦闘の始めにも出ない', () => {
    const store = fakeStore();
    const stop = watchViewChange(store);
    useStatusList.getState().show({ side: 'ally', id: 'h1' });
    // 手番が進むだけなら開いたまま
    store.setState({ battle: battle({ phase: 'enemy' }) });
    expect(useStatusList.getState().open).toEqual({ side: 'ally', id: 'h1' });
    // 勝った（勝利画面）
    store.setState({ battle: battle({ phase: 'victory' }) });
    expect(useStatusList.getState().open).toBeNull();
    // 勝利画面で開き直しても、報酬の画面 → 次の戦闘で残らない
    useStatusList.getState().show({ side: 'ally', id: 'h1' });
    store.setState({ game: game('reward') });
    expect(useStatusList.getState().open).toBeNull();
    store.setState({ game: game('battle'), battle: battle({ seed: 9 }) });
    expect(useStatusList.getState().open).toBeNull();
    stop();
  });

  it('長押しの説明も、世界マップ・ダンジョンへ移ると閉じる。同じ画面のままなら閉じない', () => {
    const store = fakeStore();
    const stop = watchViewChange(store);
    useDetail.getState().show({ type: 'ally', id: 'h1' });
    store.setState({ battle: battle({ turn: 2 }) });
    expect(useDetail.getState().detail).not.toBeNull();
    store.setState({ game: game('dungeon') });
    expect(useDetail.getState().detail).toBeNull();
    useDetail.getState().show({ type: 'item', itemId: 'x' });
    store.setState({ game: game('world') });
    expect(useDetail.getState().detail).toBeNull();
    stop();
  });

  it('見張りをやめた後は閉じない', () => {
    const store = fakeStore();
    watchViewChange(store)();
    useStatusList.getState().show({ side: 'enemy', id: 'e1' });
    store.setState({ game: game('reward') });
    expect(useStatusList.getState().open).toEqual({ side: 'enemy', id: 'e1' });
  });
});
