// ===== 回1の追加: 施設の絵を押して入る・名前の札の並べ方 =====
import { describe, expect, it } from 'vitest';
import { artBox, chooseTapTile, FACILITY_LIFT, labelBox, pickPlace, placeLabels, signpostBox, type PlaceLabel } from './placeTap';

describe('回1の追加: 施設の絵の四角', () => {
  it('描いた絵: 浮かせた分だけ上にずれ、上の端はマスの面より上まで届く', () => {
    const R = 24;
    const b = artBox({ type: 'image', big: 1.75 }, 100, 100, R);
    expect(b.x0).toBeCloseTo(100 - (R * 1.75) / 2);
    expect(b.y0).toBeCloseTo(100 - R * FACILITY_LIFT - R * 1.75 * 0.62);
    expect(b.y0).toBeLessThan(100 - R);
    expect(b.y1).toBeGreaterThan(100);
  });

  it('立て札: 東向きは右、西向きは左', () => {
    const e = signpostBox(0, 0, 20, true, false);
    const w = signpostBox(0, 0, 20, false, false);
    expect(e.x0).toBeGreaterThan(w.x0);
    expect(e.y0).toBeLessThan(0);
  });
});

describe('回1の追加: 押した所の施設', () => {
  it('絵が重なる時は、手前（マスの番号が大きい方）を先にする', () => {
    const back = { tile: 10, box: { x0: 0, y0: 0, x1: 50, y1: 50 } };
    const front = { tile: 25, box: { x0: 20, y0: 30, x1: 70, y1: 80 } };
    expect(pickPlace([back, front], 40, 40)).toBe(25);
    expect(pickPlace([front, back], 40, 40)).toBe(25);
    expect(pickPlace([back, front], 10, 10)).toBe(10);
    expect(pickPlace([back, front], 90, 90)).toBeUndefined();
  });
});

describe('回1の追加: 名前の札', () => {
  const at = (tile: number, rank: number, x: number, text = '名前名前'): PlaceLabel => ({ tile, rank, x, y: 0, text });

  it('重なる時は、次の目的地 → 町 → ダンジョン → そのほか の順で残す', () => {
    const got = placeLabels([at(1, 3, 0), at(2, 2, 10), at(3, 1, 20), at(4, 0, 30)], 12, false).map((l) => l.tile);
    expect(got).toEqual([4]);
    const two = placeLabels([at(1, 3, 0), at(2, 1, 20), at(3, 2, 200)], 12, false).map((l) => l.tile);
    expect(two).toEqual([2, 3]);
  });

  it('縮小した時は、次の目的地と町だけ', () => {
    const got = placeLabels([at(1, 0, 0), at(2, 1, 300), at(3, 2, 600), at(4, 3, 900)], 12, true).map((l) => l.tile);
    expect(got).toEqual([1, 2]);
  });

  it('札の幅は字の数で決まる', () => {
    const b = labelBox({ text: 'あいう', x: 50, y: 10 }, 12);
    expect(b.x1 - b.x0).toBe(3 * 12 + 8);
    expect(b.y0).toBe(10);
  });
});

describe('2026-11-19: 光っている行き先のマスは、施設の絵より先に選ぶ', () => {
  const reach = new Map([[11, 1], [12, 2]]);
  it('今いる町の絵が隣の光るマスに重なっていても、光るマスの上の面を押せばそのマス', () => {
    expect(chooseTapTile({ topFace: 11, place: 10, reach, here: 10 })).toBe(11);
  });
  it('光っていないマスの上の面なら、今までどおり施設の絵が先', () => {
    expect(chooseTapTile({ topFace: 30, place: 10, reach, here: 10 })).toBe(10);
  });
  it('今いるマス・行き先が無い時は、施設の絵 → 上の面', () => {
    expect(chooseTapTile({ topFace: 10, place: 10, reach, here: 10 })).toBe(10);
    expect(chooseTapTile({ topFace: 11, place: 10 })).toBe(10);
    expect(chooseTapTile({ topFace: 11 })).toBe(11);
    expect(chooseTapTile({})).toBeUndefined();
  });
});
