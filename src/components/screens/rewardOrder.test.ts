// 実機の不具合④(1)（オーナーの決定 2026-11-14）: 勝利画面の順番は「成長 → 自分のカード → 全員がそろってから戦利品の取り合い」。
// エンジンの決まりは変えず、画面の出し方（rewardStep）だけで順番を作る。1人・2人・3人・1台で2人・代わりに操作・切断中の人・保存して再開
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../data/items';
import { applyGameCommand, createGame } from '../../engine';
import type { GameState, PlayerId } from '../../types';
import { rewardClaimVisible, rewardStep, rewardWaits } from './waitNotes';

const NAMES = ['アレン', 'リナ', 'ガルド'];
const CLASSES = ['warrior', 'mage', 'priest'];
function game(seats: PlayerId[]): GameState {
  return createGame({
    seed: 3,
    scenarioId: 'corruptionKing',
    difficulty: 'normal',
    online: seats.length > 1,
    party: seats.map((playerId, i) => ({ classId: CLASSES[i], gender: 'male' as const, name: NAMES[i], playerId })),
  });
}
const itemId = ITEMS.all.find((i) => i.slot)!.id;

/** 報酬の途中の形を作る（lu = レベルアップの順。claim = 取り合いあり） */
function reward(g: GameState, opts: { lu?: string[]; claim?: boolean }) {
  const ids = g.heroes.map((h) => h.id);
  g.mode = 'reward';
  g.reward = {
    gold: 10,
    exp: [],
    levelUps: (opts.lu ?? []).map((heroId) => ({ heroId, level: 2, options: [{ kind: 'maxHp', amount: 5 } as never] })),
    cardOffers: ids.flatMap((heroId) => ['strike', 'strike', 'strike'].map((cardId) => ({ heroId, cardId }))),
    cardDone: [],
    cardPicked: false,
    loot: [],
    ...(opts.claim && ids.length > 1 ? { claim: { item: { uid: 'i1', itemId }, heroes: ids, choices: {} } } : {}),
  };
  return g;
}
const only = (...ps: PlayerId[]) => (p: PlayerId) => ps.includes(p);
const all = () => true;
/** カードを選ばない（エンジンの命令そのまま） */
const skipCard = (g: GameState, heroId: string) => {
  const p = g.heroes.find((h) => h.id === heroId)!.playerId;
  const r = applyGameCommand(g, { type: 'PICK_CARD', playerId: p, offerIndex: null, heroId });
  expect(r.error).toBeUndefined();
  return r.state;
};
const claim = (g: GameState, heroId: string) => {
  const p = g.heroes.find((h) => h.id === heroId)!.playerId;
  const r = applyGameCommand(g, { type: 'CLAIM_LOOT', playerId: p, heroId, choice: 'greed' });
  expect(r.error).toBeUndefined();
  return r.state;
};

describe('勝利画面の順番（成長 → 自分のカード → 取り合い）', () => {
  it('1人: 成長 → カード → 先へ進む（取り合いは無い）', () => {
    let g = reward(game(['P1']), { lu: ['h0'] });
    expect(rewardStep(g, all).kind).toBe('growth');
    g.reward!.levelUps = [];
    expect(rewardStep(g, all)).toEqual({ kind: 'card', heroId: 'h0' });
    g = skipCard(g, 'h0');
    expect(rewardStep(g, all).kind).toBe('finish');
  });

  it('2人オンライン: P1 はカードを選び終えても、P2 のカードが終わるまで取り合いは出ない（「○○さんが選んでいます」）', () => {
    let g = reward(game(['P1', 'P2']), { claim: true });
    const p1 = only('P1');
    expect(rewardStep(g, p1)).toEqual({ kind: 'card', heroId: 'h0' });
    g = skipCard(g, 'h0');
    const s = rewardStep(g, p1);
    expect(s.kind).toBe('wait');
    expect(s.kind === 'wait' && s.notes).toEqual([{ playerId: 'P2', what: 'リナの山札に加えるカードを選んでいます' }]);
    expect(rewardClaimVisible(g)).toBe(false);
    // P2 の画面: まだ自分のカード
    expect(rewardStep(g, only('P2'))).toEqual({ kind: 'card', heroId: 'h1' });
    g = skipCard(g, 'h1');
    // 全員のカードが終わった: 2人とも取り合い
    expect(rewardClaimVisible(g)).toBe(true);
    expect(rewardStep(g, p1).kind).toBe('claim');
    expect(rewardStep(g, only('P2')).kind).toBe('claim');
    // P1 が答えた: P2 を待つ（今度は取り合いの待ち）
    g = claim(g, 'h0');
    const w = rewardStep(g, p1);
    expect(w.kind === 'wait' && w.notes.map((n) => n.what)[0]).toContain('リナで、戦利品（');
    g = claim(g, 'h1');
    expect(g.reward!.claim!.rolls).toBeDefined();
    expect(rewardStep(g, p1).kind).toBe('finish');
  });

  it('2人オンライン: P2 の成長の間も P1 は自分のカードを選べる。その後は成長を待ち、取り合いは成長の後', () => {
    let g = reward(game(['P1', 'P2']), { lu: ['h1'], claim: true });
    expect(rewardStep(g, only('P1'))).toEqual({ kind: 'card', heroId: 'h0' });
    expect(rewardStep(g, only('P2')).kind).toBe('growth');
    g = skipCard(g, 'h0');
    g = skipCard(g, 'h1');
    const s = rewardStep(g, only('P1'));
    expect(s.kind === 'wait' && s.notes).toEqual([{ playerId: 'P2', what: 'リナのレベルアップの成長を選んでいます' }]);
    g.reward!.levelUps = [];
    expect(rewardStep(g, only('P1')).kind).toBe('claim');
  });

  it('3人オンライン: 3人目のカードが残っている間は、だれにも取り合いが出ない', () => {
    let g = reward(game(['P1', 'P2', 'P3']), { claim: true });
    g = skipCard(g, 'h0');
    g = skipCard(g, 'h1');
    for (const p of ['P1', 'P2'] as PlayerId[]) expect(rewardStep(g, only(p)).kind).toBe('wait');
    expect(rewardWaits(g, only('P1')).map((n) => n.playerId)).toEqual(['P3']);
    g = skipCard(g, 'h2');
    for (const p of ['P1', 'P2', 'P3'] as PlayerId[]) expect(rewardStep(g, only(p)).kind).toBe('claim');
  });

  it('1台で2人: 成長（全員分）→ カード（キャラの順）→ 取り合い → 先へ進む', () => {
    let g = reward(game(['P1', 'P2']), { lu: ['h0', 'h1'], claim: true });
    expect(rewardStep(g, all).kind).toBe('growth');
    g.reward!.levelUps.shift();
    expect(rewardStep(g, all).kind).toBe('growth');
    g.reward!.levelUps.shift();
    expect(rewardStep(g, all)).toEqual({ kind: 'card', heroId: 'h0' });
    g = skipCard(g, 'h0');
    expect(rewardStep(g, all)).toEqual({ kind: 'card', heroId: 'h1' });
    g = skipCard(g, 'h1');
    expect(rewardStep(g, all).kind).toBe('claim');
    g = claim(g, 'h0');
    expect(rewardStep(g, all).kind).toBe('claim');
    g = claim(g, 'h1');
    expect(rewardStep(g, all).kind).toBe('finish');
    // 1台の時は「待っています」の相手を出さない
    expect(rewardWaits(g, all)).toEqual([]);
  });

  it('代わりに操作（ホストが P2 の席も動かす）: P2 の分のカードもホストの画面に出て、そのあと取り合い', () => {
    let g = reward(game(['P1', 'P2']), { claim: true });
    const host = only('P1', 'P2');
    expect(rewardStep(g, host)).toEqual({ kind: 'card', heroId: 'h0' });
    g = skipCard(g, 'h0');
    expect(rewardStep(g, host)).toEqual({ kind: 'card', heroId: 'h1' });
    g = skipCard(g, 'h1');
    expect(rewardStep(g, host).kind).toBe('claim');
  });

  it('切断中の人（だれも代わりに操作していない）の残りは、取り合いを出すのを止めない（いつまでも出ない、を作らない）', () => {
    let g = reward(game(['P1', 'P2']), { lu: ['h1'], claim: true });
    g = skipCard(g, 'h0');
    const away = (p: PlayerId) => p === 'P2';
    expect(rewardClaimVisible(g, away)).toBe(true);
    expect(rewardStep(g, only('P1'), away).kind).toBe('claim');
    g = claim(g, 'h0');
    // P1 は答えた。P2 の分は今までどおり待つ（ホストの「代わりに操作」で進める）
    const s = rewardStep(g, only('P1'), away);
    expect(s.kind).toBe('wait');
    // 切断していない時は、今までどおり P2 を待つ
    let g2 = reward(game(['P1', 'P2']), { lu: ['h1'], claim: true });
    g2 = skipCard(g2, 'h0');
    expect(rewardStep(g2, only('P1')).kind).toBe('wait');
  });

  it('保存して再開（報酬の途中）: 保存の形から同じ段に戻る', () => {
    let g = reward(game(['P1', 'P2']), { lu: ['h1'], claim: true });
    g = skipCard(g, 'h0');
    let back = JSON.parse(JSON.stringify(g)) as GameState;
    for (const p of ['P1', 'P2'] as PlayerId[]) expect(rewardStep(back, only(p))).toEqual(rewardStep(g, only(p)));
    back = skipCard(back, 'h1');
    back.reward!.levelUps = [];
    const again = JSON.parse(JSON.stringify(back)) as GameState;
    expect(rewardStep(again, only('P1')).kind).toBe('claim');
  });
});
