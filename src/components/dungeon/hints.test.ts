import { describe, expect, it } from 'vitest';
import { moveGuide, showVoteHint } from './hints';
import type { PlayerId } from '../../types';

describe('ダンジョンの案内（フェーズ2-B）', () => {
  const all = () => true;
  const onlyP1 = (p: PlayerId) => p === 'P1';
  it('扉の案内: 1台で遊ぶ時は出さない', () => {
    expect(showVoteHint(['P1', 'P2'], all, false)).toBe(false);
  });
  it('扉の案内: 別の端末の人がいれば出す。地図を開いている間は出さない', () => {
    expect(showVoteHint(['P1', 'P2'], onlyP1, false)).toBe(true);
    expect(showVoteHint(['P1', 'P2'], onlyP1, true)).toBe(false);
  });
  it('扉の案内: 1人だけの時は出さない', () => {
    expect(showVoteHint(['P1'], onlyP1, false)).toBe(false);
  });
  it('移動の案内: 判定の前・使い切った時だけ出す', () => {
    const base = { myTurn: true, inDungeon: true, onWorld: true };
    expect(moveGuide({ ...base, explore: null })).toContain('『探索力』の判定');
    expect(moveGuide({ ...base, explore: undefined })).toContain('『探索力』の判定');
    expect(moveGuide({ ...base, explore: 0 })).toContain('手番を終える');
    expect(moveGuide({ ...base, explore: 3 })).toBeUndefined();
    expect(moveGuide({ ...base, myTurn: false, explore: null })).toBeUndefined();
    expect(moveGuide({ ...base, inDungeon: false, explore: null })).toBeUndefined();
  });
});
