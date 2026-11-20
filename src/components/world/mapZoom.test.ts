import { describe, expect, it } from 'vitest';
import { anchorScroll, baseRadius, clampZoom, COMPACT_ZOOM, minZoomFor, stepZoom, ZOOM_FLOOR, ZOOM_MAX, ZOOM_MIN } from './mapZoom';
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
    // 広い地図で縮小した値も残る（段階6a）。地図ごとの下限は地図の画面で掛ける
    expect(normalizeSettings({ worldZoom: 0.55 }).worldZoom).toBe(0.55);
    expect(normalizeSettings({ worldZoom: 0.01 }).worldZoom).toBe(ZOOM_FLOOR);
  });
});

describe('広い地図の縮小（段階6a・overhaul-plan-v2 §2-4）', () => {
  it('1倍のマスの大きさは、8列の地図と15列の地図で同じ（390px で半径 約26.5px = マスの幅 約46px）', () => {
    expect(baseRadius(390, 15)).toBeCloseTo(baseRadius(390, 8));
    expect(baseRadius(390, 8) * Math.sqrt(3)).toBeCloseTo(45.9, 0);
  });
  it('縮小の下限は「15列が枠に収まる」まで（390px で約0.54倍・360px でも同じ割合）。8列の地図は1倍のまま', () => {
    const z = minZoomFor(390, 15);
    expect(z).toBeGreaterThan(0.5);
    expect(z).toBeLessThan(0.56);
    // その倍率で、15列（と半マス）の幅が枠に収まる
    expect(baseRadius(390, 15) * z * Math.sqrt(3) * 15.5).toBeLessThanOrEqual(390);
    expect(minZoomFor(360, 15)).toBeCloseTo(z, 1);
    expect(minZoomFor(390, 8)).toBe(1);
    // パソコンの広い枠では、1倍でも収まるので下限は1
    expect(minZoomFor(1400, 15)).toBe(1);
  });
  it('−のボタン: 1 → 0.75 → 下限。＋で下限から 0.75 → 1', () => {
    const min = minZoomFor(390, 15);
    expect(stepZoom(1, -1, min)).toBe(0.75);
    expect(stepZoom(0.75, -1, min)).toBe(min);
    expect(stepZoom(min, -1, min)).toBe(min);
    expect(stepZoom(min, 1, min)).toBe(0.75);
    expect(clampZoom(0.3, min)).toBe(min);
    expect(COMPACT_ZOOM).toBe(0.75);
  });
});
