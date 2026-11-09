import { describe, expect, it } from 'vitest';
import { cameraTop, mapPadY, revealTop } from './mapCamera';

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
