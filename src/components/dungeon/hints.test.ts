import { describe, expect, it } from 'vitest';
import { showVoteHint } from './hints';
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
});
