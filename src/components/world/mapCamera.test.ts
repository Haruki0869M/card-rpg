import { describe, expect, it } from 'vitest';
import { cameraTop, clampLeft, dodgeButtons, edgeArrow, MAP_PAD_RIGHT, mapPadBottom, mapPadY, revealTop, visibleH } from './mapCamera';

describe('世界マップのカメラ（フェーズ2-D）', () => {
  it('余白は枠の半分。地図の一番下のマスでも、駒を枠の真ん中に置ける', () => {
    const viewH = 381, mapH = 1126;
    const pad = mapPadY(viewH);
    expect(pad).toBe(191);
    // 一番下のマス（地図の高さ - 半径）を真ん中に置くスクロールの位置が、スクロールできる範囲（内容の高さ - 枠）に収まる
    const y = mapH - 34;
    const top = cameraTop(y, viewH);
    expect(top).toBeLessThanOrEqual(mapH + pad * 2 - viewH);
    expect(top + viewH / 2 - pad).toBeCloseTo(y);
    // 一番上のマスも
    expect(cameraTop(34, viewH)).toBeGreaterThanOrEqual(0);
  });
  it('下のパネルが地図に重なっている時: 駒は見えている所（枠の上の端〜パネルの上の端）の真ん中。余白はパネルの高さによらない', () => {
    const viewH = 500, inset = 300, mapH = 1126;
    const top = cameraTop(600, viewH, inset);
    // 駒の画面の上の位置 = 見えている高さ（200）の半分
    expect(600 + mapPadY(viewH) - top).toBeCloseTo(visibleH(viewH, inset) / 2);
    // 一番下のマスも見えている所の真ん中に置ける（下の余白が足りる）
    expect(cameraTop(mapH - 34, viewH, inset)).toBeLessThanOrEqual(mapH + mapPadY(viewH) + mapPadBottom(viewH) - viewH);
    // 余白はパネルの高さを使わない（帯に縮んでも内容の高さが変わらず、地図が動かない）
    expect(mapPadBottom(viewH)).toBe(500);
    // 選んだマスがパネルの下に隠れていれば、見えている所へ動かす
    expect(revealTop(600, 760, top, viewH, 30, inset)).toBeDefined();
    expect(revealTop(600, 640, top, viewH, 30, inset)).toBeUndefined();
  });
  it('選んだマスが見えていれば動かさない。見えていなければ中間を真ん中に', () => {
    const viewH = 400, pad = mapPadY(viewH);
    const scrollTop = cameraTop(500, viewH); // 駒が y=500 で真ん中
    expect(revealTop(500, 560, scrollTop, viewH, 30)).toBeUndefined();
    const t = revealTop(500, 900, scrollTop, viewH, 30)!;
    expect(t + viewH / 2 - pad).toBeCloseTo(700);
  });
});

import { moveButtonText, moveStatusText } from './WorldMoveScene';

describe('移動中の帯とボタンの文言（フェーズ2-D）', () => {
  it('残り○歩で数える（1マス = 1歩）', () => {
    // path は出発のマスを含む（3マス = 2歩）
    expect(moveStatusText(0, 3, false, false).title).toBe('移動中…（残り2歩）');
    expect(moveStatusText(1, 3, false, false).title).toBe('移動中…（残り1歩）');
    expect(moveStatusText(2, 3, true, true).title).toBe('！ 到着しました');
  });
  it('移動するのボタンは、使う移動力とマスの数を両方言う', () => {
    expect(moveButtonText(3, 2)).toBe('移動する（移動力3を使う・2マス先）');
  });
});

describe('回1: 地図の端の矢印', () => {
  const box = { minX: 30, maxX: 300, minY: 60, maxY: 400 };
  it('目的地が見えている所の中なら出さない', () => {
    expect(edgeArrow(100, 200, box)).toBeUndefined();
  });
  it('外なら、真ん中から目的地へ向かう線が端と交わる所に、目的地の向きで出す', () => {
    const up = edgeArrow(165, -500, box)!;
    expect(up).toEqual({ x: 165, y: 60, deg: -90 });
    const right = edgeArrow(900, 230, box)!;
    expect(right.x).toBe(300);
    expect(right.y).toBeCloseTo(230);
    expect(right.deg).toBeCloseTo(0);
    const downLeft = edgeArrow(-1000, 2000, box)!;
    expect(downLeft.y === 400 || downLeft.x === 30).toBe(true);
    expect(downLeft.x).toBeGreaterThanOrEqual(30);
    expect(downLeft.y).toBeLessThanOrEqual(400);
  });
  it('置ける範囲が無い（見えている地図がとても低い）時は出さない', () => {
    expect(edgeArrow(0, -500, { minX: 30, maxX: 300, minY: 82, maxY: 40 })).toBeUndefined();
  });
});

describe('狭い画面 回2: 地図の右の余白と、ボタンの下のマス', () => {
  it('右の余白はボタンの列の幅ぶん（72px）。初めの位置・追いかける位置は前と同じ範囲（余白を見せない）', () => {
    expect(MAP_PAD_RIGHT).toBe(72);
    // 8列の地図（幅 = 枠）: 右の端のマスでも、自動では横に動かさない
    expect(clampLeft(390 - 23 - 195, 390, 390)).toBe(0);
    expect(clampLeft(-50, 390, 390)).toBe(0);
    // 広い地図（幅 700）: 右の端は 700 - 390 まで（余白の 72 は見せない）
    expect(clampLeft(600, 390, 700)).toBe(310);
    expect(clampLeft(100, 390, 700)).toBe(100);
  });
  // ふつうの画面の右下の列（見取り図・拡大・標準・縮小）と「戻る」のボタン。枠 390、見えている高さ 330
  const col = { left: 330, top: 70, right: 386, bottom: 270 };
  const back = { left: 338, top: 278, right: 386, bottom: 326 };
  const view = { left: 0, top: 0, right: 390, bottom: 330 };
  it('ボタンにかかっていなければ動かさない（真ん中のマス・左の端のマス）', () => {
    expect(dodgeButtons(195, 165, 23, [col, back], view, { left: 0, right: 72, up: 400, down: 400 })).toBeUndefined();
    expect(dodgeButtons(23, 165, 23, [col, back], view, { left: 0, right: 72, up: 400, down: 400 })).toBeUndefined();
  });
  it('右の端のマスがボタンの列の下なら、余白の分だけ地図を左へ寄せる（いちばん小さく動かす）', () => {
    const d = dodgeButtons(367, 165, 23, [col, back], view, { left: 0, right: 72, up: 400, down: 400 })!;
    expect(d).toBeDefined();
    expect(d.dy).toBe(0);
    expect(d.dx).toBeGreaterThan(0);
    expect(d.dx).toBeLessThanOrEqual(72);
    // 寄せた後はボタンにかからない
    expect(367 - d.dx + 23).toBeLessThanOrEqual(col.left);
  });
  it('測った形（390×844・15列の地図・右端の駒）: 駒が列の下でも、72px の余白の中で寄せられる', () => {
    const rects = [{ left: 322, top: 137, right: 386, bottom: 343 }, { left: 334, top: 343, right: 386, bottom: 395 }];
    const d = dodgeButtons(375, 205, 26.5 * 0.7, rects, { left: 0, top: 0, right: 390, bottom: 399 }, { left: 321, right: 72, up: 1105, down: 400 })!;
    expect(d).toBeDefined();
    expect(d.dx).toBeGreaterThan(0);
    expect(d.dx).toBeLessThanOrEqual(72);
  });
  it('余白が無い（右へ動かせない）時は、上か下へ寄せる。どこにも寄せられなければ動かさない', () => {
    const d = dodgeButtons(367, 90, 23, [col, back], view, { left: 0, right: 0, up: 400, down: 400 })!;
    expect(d.dx).toBe(0);
    expect(90 - d.dy + 23 <= col.top || 90 - d.dy - 23 >= col.bottom).toBe(true);
    expect(dodgeButtons(367, 165, 23, [col, back], view, { left: 0, right: 0, up: 0, down: 0 })).toBeUndefined();
  });
  it('上の横の列（低い画面の 見取り図＋🔍）の下: 右へ少し寄せるか、下へ寄せる。見えている所の外へは出さない', () => {
    const row = { left: 276, top: 4, right: 386, bottom: 60 };
    const d = dodgeButtons(300, 40, 23, [row], view, { left: 0, right: 72, up: 400, down: 400 })!;
    expect(d).toBeDefined();
    const x = 300 - d.dx, y = 40 - d.dy;
    expect(x + 23 <= row.left || y - 23 >= row.bottom).toBe(true);
    expect(y - 23).toBeGreaterThanOrEqual(0);
  });
});
