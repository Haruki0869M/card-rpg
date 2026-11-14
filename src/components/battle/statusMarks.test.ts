// 状態の印の並べ方（狭い画面の直し 回3）: 並べる順・大きな印か小さい札か・「＋N」の数・一覧の中身
import { describe, expect, it } from 'vitest';
import { LAYER } from '../ui/layers';
import { breakDropFor, CALLOUT_CLEAR } from './breakDrop';
import { chipMode, collectMarks, fitMarks, moreChipW, SMALL_CHIP, smallChipW, type Mark } from './statusMarks';

describe('状態の印の並べ方', () => {
  it('今の手を変える印（❄隠れている・🕯喰った灯・挑発・かばう）が先、その後に状態異常', () => {
    const marks = collectMarks({ poison: 3, vulnerable: 2, weak: 1 }, { hidden: true, lamp: 2, tauntedBy: 'a1', guarding: true });
    expect(marks.slice(0, 4).map((m) => m.status)).toEqual(['hidden', 'lamp', 'taunt', 'guard']);
    expect(marks.slice(4).map((m) => m.status).sort()).toEqual(['poison', 'vulnerable', 'weak'].sort());
    expect(marks.find((m) => m.status === 'taunt')?.by).toBe('a1');
    expect(marks.find((m) => m.status === 'lamp')?.amount).toBe(2);
  });

  it('喰った灯は 0 でも出す（決まりが働いている時）・付いていない物は出さない', () => {
    expect(collectMarks({}, { lamp: 0 }).map((m) => m.status)).toEqual(['lamp']);
    expect(collectMarks({ poison: 0 }, {})).toEqual([]);
  });

  it('白狼王に4つ（毒・脆弱・弱体＋隠れている）でも、隠れているが一番前', () => {
    const marks = collectMarks({ poison: 3, vulnerable: 2, weak: 1 }, { hidden: true });
    expect(marks[0].status).toBe('hidden');
    expect(marks).toHaveLength(4);
  });
});

describe('大きな印か小さい札か', () => {
  it('2つまでは今までの大きな印。3つ以上は小さい札', () => {
    expect(chipMode(0, false)).toBe('big');
    expect(chipMode(1, false)).toBe('big');
    expect(chipMode(2, false)).toBe('big');
    expect(chipMode(3, false)).toBe('small');
    expect(chipMode(5, false)).toBe('small');
  });
  it('低い画面は1つから小さい札（切れない高さ）', () => {
    expect(chipMode(1, true)).toBe('small');
    expect(chipMode(2, true)).toBe('small');
    expect(chipMode(4, true)).toBe('small');
  });
});

describe('「＋N」の数', () => {
  const m = (status: string, amount = 3): Mark => ({ status, amount });
  const four = [m('hidden', 1), m('poison'), m('vulnerable', 2), m('weak', 1)];
  const width = (ms: Mark[], more: number) => ms.reduce((w, x, i) => w + smallChipW(x) + (i ? SMALL_CHIP.gap : 0), 0) + (more ? SMALL_CHIP.gap + moreChipW(more) : 0);

  it('全部入る時は「＋N」を出さない', () => {
    const r = fitMarks(four, 200);
    expect(r.more).toBe(0);
    expect(r.shown).toHaveLength(4);
  });
  it('入らない時は、出ている数＋N = 本当の数。出ている分＋「＋N」が幅に入る', () => {
    for (const w of [104, 90, 70, 60, 50, 40]) {
      const r = fitMarks(four, w);
      expect(r.shown.length + r.more).toBe(4);
      if (r.more) expect(width(r.shown, r.more)).toBeLessThanOrEqual(w);
      // 前から順（大事な印が残る）
      expect(r.shown.map((x) => x.status)).toEqual(four.slice(0, r.shown.length).map((x) => x.status));
    }
  });
  it('幅がとても狭い時は「＋N」だけ（N = 全部）', () => {
    const r = fitMarks(four, 20);
    expect(r.shown).toHaveLength(0);
    expect(r.more).toBe(4);
  });
  it('数を出さない印（挑発・かばう・隠れている）は数の分だけ細い', () => {
    expect(smallChipW(m('hidden', 1))).toBeLessThan(smallChipW(m('poison', 3)));
    expect(smallChipW(m('poison', 12))).toBeGreaterThan(smallChipW(m('poison', 3)));
  });
});

describe('「⚡BREAK!」の高さ', () => {
  it('絵が大きい時は今までどおり絵の高さの4割', () => {
    expect(breakDropFor(128, 4, 40)).toBe(Math.round(128 * 0.4));
  });
  it('絵が 40px の時は、技名の帯の下の端より下まで下げる', () => {
    const top = 4, popupTop = 0;
    expect(top + popupTop + breakDropFor(40, top, popupTop)).toBeGreaterThanOrEqual(CALLOUT_CLEAR);
    // 互い違いにずれた敵（上の端 14px）も
    expect(14 + breakDropFor(40, 14, 0)).toBeGreaterThanOrEqual(CALLOUT_CLEAR);
  });
  it('大きな敵（絵が箱からはみ出す）でも帯の下', () => {
    expect(4 + 0 + breakDropFor(60, 4, 0)).toBeGreaterThanOrEqual(CALLOUT_CLEAR);
  });
});

describe('状態の一覧の層', () => {
  it('待ちの帯・通信の知らせ・シートより手前、詳しい説明より奥（2人で遊ぶ時、待ち中でも開けて閉じられる）', () => {
    expect(LAYER.statusList).toBeGreaterThan(LAYER.turnLock);
    expect(LAYER.statusList).toBeGreaterThan(LAYER.online);
    expect(LAYER.statusList).toBeGreaterThan(LAYER.sheet);
    expect(LAYER.statusList).toBeLessThan(LAYER.detail);
    expect(new Set(Object.values(LAYER)).size).toBe(Object.values(LAYER).length);
  });
});
