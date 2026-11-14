import { describe, expect, it } from 'vitest';
import { visibleHeight } from './useAppHeight';
import { LOW_ENTER, LOW_EXIT, nextLow } from './useLowScreen';

const run = (hs: (number | null)[], start: boolean | null = null) => {
  let v = start;
  const out: boolean[] = [];
  for (const h of hs) out.push((v = nextLow(v, h)));
  return out;
};

describe('低い画面の切り替え（狭い画面 回0）', () => {
  it('最初の値: 639 は低い形・640 はふつう', () => {
    expect(nextLow(null, 639)).toBe(true);
    expect(nextLow(null, 640)).toBe(false);
    expect(LOW_ENTER).toBe(640);
    expect(LOW_EXIT).toBe(672);
  });
  it('入る線と出る線が別（639→641→639 で切り替わらない・671 まで低いまま・672 で戻る）', () => {
    expect(run([639, 641, 639, 671])).toEqual([true, true, true, true]);
    expect(run([639, 672])).toEqual([true, false]);
    // ふつうの形から: 641・660・671 では入らない
    expect(run([700, 660, 641, 671, 640])).toEqual([false, false, false, false, false]);
    expect(run([700, 639])).toEqual([false, true]);
  });
  it('拡大中・入力中（測らない = null）は前の値のまま', () => {
    expect(run([540, null, null])).toEqual([true, true, true]);
    expect(run([844, null])).toEqual([false, false]);
    // 入力中にキーボードで 300 になっても、測らないので形は変わらない
    const typing = visibleHeight({ innerHeight: 844, visualViewport: { height: 300, scale: 1 }, typing: true });
    expect(nextLow(false, typing)).toBe(false);
    const zoomed = visibleHeight({ innerHeight: 844, visualViewport: { height: 300, scale: 2 }, typing: false });
    expect(nextLow(false, zoomed)).toBe(false);
    // まだ決めていない時に測れなければ、ふつうの形
    expect(nextLow(null, null)).toBe(false);
  });
  it('見えている高さで決める（ブラウザが言う高さが 720 でも、見えている高さが 540 なら低い形）', () => {
    expect(nextLow(null, visibleHeight({ innerHeight: 720, visualViewport: { height: 540, scale: 1 }, typing: false }))).toBe(true);
    expect(nextLow(null, visibleHeight({ innerHeight: 844, visualViewport: { height: 844, scale: 1 }, typing: false }))).toBe(false);
  });
  it('回転は切り替わる（大きく変わる時）', () => {
    expect(run([844, 390, 844])).toEqual([false, true, false]);
  });
});
