import { describe, expect, it } from 'vitest';
import { visibleHeight } from './useAppHeight';
import { LOW_ENTER, LOW_EXIT, nextLow } from './useLowScreen';
import { LAYER } from '../components/ui/layers';

const run = (hs: (number | null)[], start: boolean | null = null) => {
  let v = start;
  const out: boolean[] = [];
  for (const h of hs) out.push((v = nextLow(v, h)));
  return out;
};

describe('低い画面の切り替え（狭い画面 回0）', () => {
  it('最初の値: 700 は低い形・701 はふつう（2026-11-20: 町の低い形と同じ 700 以下に広げた。360×640 も低い形）', () => {
    expect(nextLow(null, 640)).toBe(true);
    expect(nextLow(null, 700)).toBe(true);
    expect(nextLow(null, 701)).toBe(false);
    expect(LOW_ENTER).toBe(701);
    expect(LOW_EXIT).toBe(733);
  });
  it('入る線と出る線が別（700→702→700 で切り替わらない・732 まで低いまま・733 で戻る）', () => {
    expect(run([700, 702, 700, 732])).toEqual([true, true, true, true]);
    expect(run([700, 733])).toEqual([true, false]);
    // ふつうの形から: 702・720・732 では入らない
    expect(run([760, 720, 702, 732, 701])).toEqual([false, false, false, false, false]);
    expect(run([760, 700])).toEqual([false, true]);
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

describe('低い画面の災厄の窓の層（回1）', () => {
  it('待ちの帯・通信の知らせより手前、シートより奥', () => {
    expect(LAYER.turnLock).toBeLessThan(LAYER.scourgeDialog);
    expect(LAYER.online).toBeLessThan(LAYER.scourgeDialog);
    expect(LAYER.scourgeDialog).toBeLessThan(LAYER.sheet);
  });
});
