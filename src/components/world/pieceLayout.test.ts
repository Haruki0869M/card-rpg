import { describe, expect, it } from 'vitest';
import { orderOnTile, pieceSpots, PLAYER_COLORS } from './pieceLayout';

describe('ワールドマップの駒の並べ方', () => {
  it('1人ならマスの中心に大きく置く', () => {
    expect(pieceSpots(1)).toEqual([{ dx: 0, dy: 0, size: 1.25, z: 0 }]);
  });

  it('2〜4人は左奥から右手前へ斜めに並び、手前ほど上に重なる', () => {
    for (const n of [2, 3, 4]) {
      const s = pieceSpots(n);
      expect(s).toHaveLength(n);
      for (let k = 1; k < n; k++) {
        expect(s[k].dx).toBeGreaterThan(s[k - 1].dx);
        expect(s[k].dy).toBeGreaterThan(s[k - 1].dy);
        expect(s[k].z).toBeGreaterThan(s[k - 1].z);
      }
      // 中心のまわりにそろう
      const sum = s.reduce((a, p) => a + p.dx, 0);
      expect(Math.abs(sum)).toBeLessThan(1e-9);
    }
  });

  it('人数が多いほど駒は小さく、奥の駒の顔のメダルも大部分が見える', () => {
    const sizes = [1, 2, 3, 4].map((n) => pieceSpots(n)[0].size);
    for (let k = 1; k < sizes.length; k++) expect(sizes[k]).toBeLessThan(sizes[k - 1]);
    for (const n of [2, 3, 4]) {
      const s = pieceSpots(n);
      const medal = s[0].size * 0.72; // HeroPiece の MEDAL（顔のメダルの直径）
      const gap = Math.hypot(s[1].dx - s[0].dx, s[1].dy - s[0].dy);
      expect(gap).toBeGreaterThan(medal * 0.75);
    }
  });

  it('マスの外へ大きくはみ出さない（中心から1マス半径以内）', () => {
    for (const n of [1, 2, 3, 4]) for (const p of pieceSpots(n)) expect(Math.abs(p.dx) + p.size / 2).toBeLessThanOrEqual(1.05);
  });

  it('5人以上が来ても4人分の並びにおさめる', () => {
    expect(pieceSpots(6)).toHaveLength(4);
    expect(pieceSpots(0)).toHaveLength(1);
  });

  it('手番のキャラを一番手前にし、ほかの順は変えない', () => {
    expect(orderOnTile(['a', 'b', 'c'], 'a')).toEqual(['b', 'c', 'a']);
    expect(orderOnTile(['a', 'b', 'c'], 'c')).toEqual(['a', 'b', 'c']);
    expect(orderOnTile(['a', 'b'], 'x')).toEqual(['a', 'b']);
    expect(orderOnTile(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('P1〜P4の台座の色はすべて違う', () => {
    expect(new Set(Object.values(PLAYER_COLORS)).size).toBe(4);
  });
});
