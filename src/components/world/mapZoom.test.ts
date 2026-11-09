import { describe, expect, it } from 'vitest';
import { anchorScroll, clampZoom, stepZoom, ZOOM_MAX, ZOOM_MIN } from './mapZoom';
import { normalizeSettings } from '../../store/settings';

describe('世界マップの拡大', () => {
  it('1倍より小さく・最大より大きくならない。壊れた値は1倍', () => {
    expect(clampZoom(0.5)).toBe(ZOOM_MIN);
    expect(clampZoom(9)).toBe(ZOOM_MAX);
    expect(clampZoom('x')).toBe(1);
    expect(clampZoom(NaN)).toBe(1);
    expect(clampZoom(1.333333)).toBe(1.33);
  });
  it('＋・−は0.25ずつ。半端な値は区切りにそろえる。端で止まる', () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(1);
    expect(stepZoom(2.5, 1)).toBe(2.5);
    expect(stepZoom(2.5, -1)).toBe(2.25);
    expect(stepZoom(1.4, 1)).toBe(1.5);
    expect(stepZoom(1.4, -1)).toBe(1.25);
  });
  it('拡大の前後で、指の間の地面が同じ所に残る', () => {
    const a = { left: 10, top: 300, ax: 195, ay: 200, padY: 190 };
    const s = anchorScroll(a, 26, 52);
    // 前: 地図の中の点 = (205, 310)。後: 2倍の (410, 620) が枠の (195, 200) に来る
    expect(s.left + a.ax).toBeCloseTo(410);
    expect(s.top + a.ay - a.padY).toBeCloseTo(620);
  });
  it('設定: 拡大はこの端末に保存。無い時は1倍', () => {
    expect(normalizeSettings(null).worldZoom).toBe(1);
    expect(normalizeSettings({ worldZoom: 2 }).worldZoom).toBe(2);
    expect(normalizeSettings({ worldZoom: 99 }).worldZoom).toBe(ZOOM_MAX);
  });
});
