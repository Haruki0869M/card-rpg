import { describe, expect, it } from 'vitest';
import type { ChestRoll } from '../../types';
import { buildTimeline } from './ChestScreen';
import { chestVideoUrl } from './ChestVideo';

const roll = (grade: ChestRoll['grade']): ChestRoll => ({ kind: 'luck', heroId: 'h0', results: ['hit', 'miss', 'hit'], success: false, grade });

describe('宝箱が開く動画', () => {
  it('4つの格すべてに動画がある', () => {
    for (const r of ['common', 'rare', 'epic', 'legend'] as const) expect(chestVideoUrl(r)).toBeTruthy();
  });
  it('動画ありの時は、結果の直前に動画の段が1つ入る', () => {
    for (const g of ['common', 'rare', 'epic', 'legend'] as const) {
      const kinds = buildTimeline(roll(g), true).map((s) => s.kind);
      expect(kinds.filter((k) => k === 'video')).toHaveLength(1);
      expect(kinds.slice(-2)).toEqual(['video', 'result']);
    }
  });
  it('動画なし（動作軽減・簡易・読めない時）は今までの段取りのまま', () => {
    for (const g of ['common', 'legend'] as const) {
      expect(buildTimeline(roll(g)).map((s) => s.kind)).not.toContain('video');
      expect(buildTimeline(roll(g), true).filter((s) => s.kind !== 'video')).toEqual(buildTimeline(roll(g)));
    }
  });
});
