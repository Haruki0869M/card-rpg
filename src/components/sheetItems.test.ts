// 実機の不具合②⑥（2026-11-14）: シートの持ち物の行の決まり
import { describe, expect, it } from 'vitest';
import { createGame } from '../engine';
import type { GameState, PlayerId } from '../types';
import { giveBlockReason, goldChoices, itemRows, liveRow, useBlockReason } from './sheetItems';
import { visibleHeight } from '../hooks/useAppHeight';
import { LAYER } from './ui/layers';

function two(): GameState {
  const g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: (['P1', 'P2'] as PlayerId[]).map((playerId, i) => ({ playerId, classId: 'warrior', gender: 'male' as const, name: `仲間${i}` })) });
  for (const h of g.heroes) g.world!.pos[h.id] = g.world!.pos.h0;
  g.heroes[0].pouch = [{ uid: 'a', itemId: 'potion' }, { uid: 'b', itemId: 'potion' }];
  return g;
}

describe('持ち物の行', () => {
  it('同じ道具はまとめる。装備の予備は1つずつ', () => {
    const g = two();
    const rows = itemRows(g.heroes[0]);
    expect(rows.pouch).toEqual([{ itemId: 'potion', uids: ['a', 'b'] }]);
    expect(rows.stash).toBe(g.heroes[0].stash);
  });
  it('開いた行の品物が消えた（仲間が使った・取り直し）時は、閉じた扱い（古い物を指したまま描かない）', () => {
    const g = two();
    const h = g.heroes[0];
    expect(liveRow(h, { kind: 'pouch', uid: 'a', mode: 'use' })).not.toBeNull();
    h.pouch = h.pouch.filter((p) => p.uid !== 'a');
    expect(liveRow(h, { kind: 'pouch', uid: 'a', mode: 'use' })).toBeNull();
    expect(liveRow(h, { kind: 'stash', uid: 'zz', mode: 'give' })).toBeNull();
    expect(liveRow(undefined, { kind: 'gold', mode: 'give' })).toBeNull();
    expect(liveRow(h, { kind: 'gold', mode: 'give' })).toEqual({ kind: 'gold', mode: 'give' });
  });
  it('渡せない理由: 同じ場所に仲間がいない・戦闘中', () => {
    const g = two();
    expect(giveBlockReason(g, g.heroes[0])).toBeNull();
    g.world!.pos.h1 = g.world!.pos.h0 + 1;
    expect(giveBlockReason(g, g.heroes[0])).toMatch(/同じ場所に仲間がいないので渡せません/);
    g.mode = 'battle';
    expect(giveBlockReason(g, g.heroes[0])).toMatch(/戦闘中は渡せません/);
  });
  it('使えない理由: 戦闘中は行動中のキャラの袋だけ（道具袋のシートと同じ決まり）', () => {
    const g = two();
    expect(useBlockReason(g, g.heroes[0], 'h1')).toBeNull();
    g.mode = 'battle';
    expect(useBlockReason(g, g.heroes[0], 'h1')).toMatch(/行動中のキャラ（仲間1）の道具だけ/);
  });
  it('ゴールドの量の候補', () => {
    expect(goldChoices(0)).toEqual([]);
    expect(goldChoices(5)).toEqual([5]);
    expect(goldChoices(30)).toEqual([10, 30]);
    expect(goldChoices(50)).toEqual([10, 50]);
    expect(goldChoices(120)).toEqual([10, 50, 120]);
  });
});

describe('見えている高さ（点検 F6）', () => {
  it('見えている高さが 100dvh より短い時は、見えている高さを使う', () => {
    expect(visibleHeight({ innerHeight: 600, visualViewport: { height: 540, scale: 1 }, typing: false })).toBe(540);
  });
  it('指で拡大している時・文字を入力中（キーボード）は測り直さない', () => {
    expect(visibleHeight({ innerHeight: 600, visualViewport: { height: 300, scale: 2 }, typing: false })).toBeNull();
    expect(visibleHeight({ innerHeight: 600, visualViewport: { height: 300, scale: 1 }, typing: true })).toBeNull();
  });
  it('visualViewport が無いブラウザは innerHeight', () => {
    expect(visibleHeight({ innerHeight: 580, visualViewport: null, typing: false })).toBe(580);
  });
});

describe('重なりの順番（点検 F10）', () => {
  it('待ちの帯 < 通信の知らせ < シート < シートの確認 < カード選び < 遊び方 < お知らせ < 詳しい説明', () => {
    const order = [LAYER.turnLock, LAYER.online, LAYER.sheet, LAYER.sheetConfirm, LAYER.cardPick, LAYER.help, LAYER.toast, LAYER.detail];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(new Set(order).size).toBe(order.length);
  });
});
