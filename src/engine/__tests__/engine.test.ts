import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { getCharacter } from '../../data/characters';
import type { AllyState, BattleState, CardInstance } from '../../types';
import {
  absorb,
  applyCommand,
  calcDamage,
  createBattle,
  createRng,
  drawCards,
  finalChance,
  incomingDamage,
  rollSlots,
  selectTier,
  successDistribution,
  tierDistribution,
  toPercents,
} from '../index';

const statuses = (vulnerable = 0, weak = 0) => ({ vulnerable, weak });

/** テスト用: 指定キャラの手札を差し替える */
function giveHand(state: BattleState, allyId: string, cardIds: string[]): CardInstance[] {
  const ally = state.allies.find((a) => a.id === allyId)!;
  ally.hand = cardIds.map((cardId, i) => ({ uid: `t${i}`, cardId }));
  return ally.hand;
}

describe('成功率計算', () => {
  it('基礎成功率 + 適性補正', () => {
    expect(finalChance(getCard('heavySwing'), getCharacter('warrior').affinity)).toBe(75);
    expect(finalChance(getCard('heavySwing'), getCharacter('mage').affinity)).toBe(55);
    expect(finalChance(getCard('gambleBolt'), getCharacter('mage').affinity)).toBe(60);
  });
  it('5%〜95%に制限される', () => {
    const card = { ...getCard('guard'), baseChance: 95 };
    expect(finalChance(card, { physical: 0, magic: 0, skill: 10 })).toBe(95);
    const low = { ...getCard('magicArrow'), baseChance: 10 };
    expect(finalChance(low, { physical: 0, magic: -20, skill: 0 })).toBe(5);
  });
});

describe('スロット判定', () => {
  it('フォーカス枠は左に並び確定成功', () => {
    const rng = createRng(1);
    const r = rollSlots(4, 2, 5, rng);
    expect(r.slice(0, 2)).toEqual(['focus', 'focus']);
    expect(r).toHaveLength(4);
  });
  it('同じシードなら同じ結果', () => {
    expect(rollSlots(4, 0, 50, createRng(42))).toEqual(rollSlots(4, 0, 50, createRng(42)));
  });
  it('表示した確率どおりに抽選される（統計）', () => {
    const rng = createRng(7);
    let hits = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (rollSlots(1, 0, 70, rng)[0] === 'hit') hits++;
    expect(hits / N).toBeGreaterThan(0.68);
    expect(hits / N).toBeLessThan(0.72);
  });
  it('成功数の確率分布（二項分布 + フォーカス確定）', () => {
    const d = successDistribution(3, 1, 70);
    expect(d[0]).toBe(0);
    expect(d[1]).toBeCloseTo(0.09);
    expect(d[2]).toBeCloseTo(0.42);
    expect(d[3]).toBeCloseTo(0.49);
    expect(toPercents(d)).toEqual([0, 9, 42, 49]);
  });
  it('全フォーカスなら完全成功100%', () => {
    const d = tierDistribution(getCard('heavySwing'), 3, 70);
    expect(d[3]).toBe(1);
  });
});

describe('Tier選択', () => {
  it('成功数に応じたTier', () => {
    const hs = getCard('heavySwing');
    expect(selectTier(hs, 0).effects[0]).toEqual({ kind: 'damage', amount: 3 });
    expect(selectTier(hs, 2).effects[0]).toEqual({ kind: 'damage', amount: 15 });
    expect(selectTier(hs, 3).effects).toHaveLength(2);
  });
  it('ギャンブルボルトは0〜1成功が同じTier', () => {
    const gb = getCard('gambleBolt');
    expect(selectTier(gb, 0)).toBe(selectTier(gb, 1));
    expect(selectTier(gb, 4).effects[1]).toEqual({ kind: 'gainMana', amount: 1 });
    expect(tierDistribution(gb, 0, 50).reduce((a, b) => a + b)).toBeCloseTo(1);
  });
});

describe('ダメージ計算順', () => {
  it('基礎値 → 弱体 → 脆弱 → 切り捨て', () => {
    expect(calcDamage(10, statuses(), statuses())).toBe(10);
    expect(calcDamage(10, statuses(0, 1), statuses())).toBe(7); // 7.5 → 7
    expect(calcDamage(15, statuses(), statuses(1))).toBe(22); // 22.5 → 22
    expect(calcDamage(10, statuses(0, 1), statuses(1))).toBe(11); // 11.25 → 11（途中で切り捨てない）
    expect(calcDamage(7, statuses(0, 2), statuses(2))).toBe(7); // 7.875 → 7
  });
  it('ブロックで吸収してから残りをHPへ', () => {
    expect(absorb(10, 4, 30)).toEqual({ block: 0, hp: 24, blocked: 4, hpLoss: 6 });
    expect(absorb(5, 8, 30)).toEqual({ block: 3, hp: 30, blocked: 5, hpLoss: 0 });
    expect(absorb(50, 0, 30)).toEqual({ block: 0, hp: 0, blocked: 0, hpLoss: 30 });
  });
});

describe('山札', () => {
  const mkAlly = (draw: number, discard: number, hand = 0): AllyState => ({
    id: 'warrior',
    hp: 1,
    maxHp: 1,
    block: 0,
    mana: 3,
    focus: 4,
    statuses: statuses(),
    drawPile: Array.from({ length: draw }, (_, i) => ({ uid: `d${i}`, cardId: 'strike' })),
    discard: Array.from({ length: discard }, (_, i) => ({ uid: `x${i}`, cardId: 'guard' })),
    hand: Array.from({ length: hand }, (_, i) => ({ uid: `h${i}`, cardId: 'guard' })),
    dead: false,
  });
  it('山札が尽きたら捨札をシャッフルして引く', () => {
    const a = mkAlly(2, 6);
    const r = drawCards(a, 5, createRng(3));
    expect(r).toEqual({ drawn: 5, reshuffled: true });
    expect(a.hand).toHaveLength(5);
    expect(a.drawPile).toHaveLength(3);
    expect(a.discard).toHaveLength(0);
    // 先に元の山札2枚を引いている
    expect(a.hand.slice(0, 2).map((c) => c.uid)).toEqual(['d0', 'd1']);
  });
  it('手札上限10枚を超えて引かない', () => {
    const a = mkAlly(5, 0, 8);
    expect(drawCards(a, 5, createRng(1)).drawn).toBe(2);
    expect(a.hand).toHaveLength(10);
  });
  it('山札も捨札も空なら引けない', () => {
    const a = mkAlly(0, 0);
    expect(drawCards(a, 5, createRng(1))).toEqual({ drawn: 0, reshuffled: false });
  });
});

describe('戦闘の流れ', () => {
  it('開始時: 各キャラ5枚・マナ3・フォーカス4・インテント表示', () => {
    const s = createBattle(123, 2);
    expect(s.allies).toHaveLength(2);
    for (const a of s.allies) {
      expect(a.hand).toHaveLength(5);
      expect(a.drawPile).toHaveLength(5);
      expect(a.mana).toBe(3);
      expect(a.focus).toBe(4);
    }
    expect(s.enemies.every((e) => e.intent)).toBe(true);
    // シャーマンの1ターン目は必ず「呪い」
    expect(s.enemies[1].intent?.actionId).toBe('curse');
    expect(s.enemies[0].intent?.actionId).toBe('slam');
  });
  it('4人モードは敵HP1.7倍（切り捨て）', () => {
    const s = createBattle(1, 4);
    expect(s.allies).toHaveLength(4);
    expect(s.enemies.map((e) => e.maxHp)).toEqual([88, 61, 44]);
  });
  it('同じシードなら同じ戦闘', () => {
    expect(createBattle(99, 2)).toEqual(createBattle(99, 2));
  });
  it('フォーカス全投入で完全成功・コストとフォーカスを消費・捨札へ', () => {
    const s = createBattle(5, 2);
    const [card] = giveHand(s, 'warrior', ['heavySwing']);
    const target = s.enemies[2];
    const { state, events, error } = applyCommand(s, {
      type: 'PLAY_CARD',
      characterId: 'warrior',
      cardInstanceId: card.uid,
      targetId: target.uid,
      focusUsed: 3,
    });
    expect(error).toBeUndefined();
    const w = state.allies[0];
    expect(w.mana).toBe(1);
    expect(w.focus).toBe(1);
    expect(w.discard.map((c) => c.uid)).toContain(card.uid);
    const roll = events[0];
    expect(roll.type === 'roll' && roll.perfect).toBe(true);
    // 26ダメージ → 斥候(26)は倒れる
    expect(state.enemies[2].dead).toBe(true);
    expect(state.stats.perfects).toBe(1);
    // 元の state は変わらない
    expect(s.allies[0].mana).toBe(3);
  });
  it('完全成功の脆弱はダメージの後に付与（その攻撃には乗らない）', () => {
    const s = createBattle(5, 2);
    const [card] = giveHand(s, 'warrior', ['heavySwing']);
    const { state } = applyCommand(s, {
      type: 'PLAY_CARD',
      characterId: 'warrior',
      cardInstanceId: card.uid,
      targetId: 'e0',
      focusUsed: 3,
    });
    expect(state.enemies[0].hp).toBe(52 - 26);
    expect(state.enemies[0].statuses.vulnerable).toBe(2);
  });
  it('マナ不足・フォーカス超過はエラーで状態不変', () => {
    const s = createBattle(5, 2);
    const [card] = giveHand(s, 'warrior', ['heavySwing']);
    s.allies[0].mana = 1;
    const r = applyCommand(s, { type: 'PLAY_CARD', characterId: 'warrior', cardInstanceId: card.uid, targetId: 'e0', focusUsed: 0 });
    expect(r.error).toBe('マナが足りません');
    expect(r.state).toBe(s);
    s.allies[0].mana = 3;
    const r2 = applyCommand(s, { type: 'PLAY_CARD', characterId: 'warrior', cardInstanceId: card.uid, targetId: 'e0', focusUsed: 4 });
    expect(r2.error).toBeDefined();
  });
  it('脆弱2は「付与ターン＋次の味方フェーズ」まで続く', () => {
    let s = createBattle(5, 2);
    s.enemies[0].statuses.vulnerable = 2;
    s = applyCommand(s, { type: 'END_TURN' }).state;
    while (s.phase === 'enemy') s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    expect(s.turn).toBe(2);
    expect(s.enemies[0].statuses.vulnerable).toBe(1);
    s = applyCommand(s, { type: 'END_TURN' }).state;
    while (s.phase === 'enemy') s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    expect(s.enemies[0].statuses.vulnerable).toBe(0);
  });
  it('ターン終了で手札は捨札へ、敵ブロックは敵フェーズ開始時に0', () => {
    const s = createBattle(5, 2);
    s.enemies[0].block = 9;
    const { state } = applyCommand(s, { type: 'END_TURN' });
    expect(state.phase).toBe('enemy');
    expect(state.allies.every((a) => a.hand.length === 0 && a.discard.length === 5)).toBe(true);
    expect(state.enemies[0].block).toBe(0);
  });
});

describe('挑発', () => {
  function setup() {
    const s = createBattle(11, 2);
    // 敵0: 単体攻撃（魔道士狙い）, 敵1: 呪い（デバフ）, 敵2: 単体攻撃（魔道士狙い）
    s.enemies[0].intent = { actionId: 'slam', targetId: 'mage' };
    s.enemies[1].intent = { actionId: 'curse', targetId: 'mage' };
    s.enemies[2].intent = { actionId: 'aimedShot', targetId: 'mage' };
    return s;
  }
  it('1成功: 対象の敵の単体攻撃だけが使用者に向く', () => {
    const s = setup();
    const [card] = giveHand(s, 'warrior', ['warCry']);
    const { state } = applyCommand(s, { type: 'PLAY_CARD', characterId: 'warrior', cardInstanceId: card.uid, targetId: 'e0', focusUsed: 1 });
    const tier = state.log.at(-1)!.text;
    if (tier.includes('完全成功')) {
      expect(state.enemies[2].intent?.targetId).toBe('warrior');
    } else {
      expect(state.enemies[0].intent?.targetId).toBe('warrior');
      expect(state.enemies[2].intent?.targetId).toBe('mage');
    }
    // デバフは単体攻撃ではないので変化しない
    expect(state.enemies[1].intent?.targetId).toBe('mage');
  });
  it('完全成功: 敵全体の単体攻撃が使用者に向く（デバフ・全体攻撃は不変）', () => {
    const s = setup();
    const [card] = giveHand(s, 'warrior', ['warCry']);
    const { state, events } = applyCommand(s, { type: 'PLAY_CARD', characterId: 'warrior', cardInstanceId: card.uid, targetId: 'e1', focusUsed: 2 });
    expect(state.enemies[0].intent?.targetId).toBe('warrior');
    expect(state.enemies[2].intent?.targetId).toBe('warrior');
    expect(state.enemies[1].intent?.targetId).toBe('mage');
    expect(state.allies[0].block).toBe(16);
    expect(events.filter((e) => e.type === 'retarget')).toHaveLength(2);
    // 被弾予定: 戦士 = 10 + 9 - 16 = 3, 魔道士 = 0
    expect(incomingDamage(state, state.allies[0])).toBe(3);
    expect(incomingDamage(state, state.allies[1])).toBe(0);
  });
  it('挑発した味方が倒れたら挑発解除・対象を決め直す', () => {
    const s = setup();
    const [card] = giveHand(s, 'warrior', ['warCry']);
    let st = applyCommand(s, { type: 'PLAY_CARD', characterId: 'warrior', cardInstanceId: card.uid, targetId: 'e1', focusUsed: 2 }).state;
    st.allies[0].hp = 1;
    st.allies[0].block = 0;
    st = applyCommand(st, { type: 'END_TURN' }).state;
    st = applyCommand(st, { type: 'ENEMY_STEP' }).state; // 敵0が戦士を倒す
    expect(st.allies[0].dead).toBe(true);
    expect(st.enemies[2].tauntedBy).toBeUndefined();
    expect(st.enemies[2].intent?.targetId).toBe('mage');
  });
});

describe('敵の行動ルール', () => {
  it('ゴブリン重装兵は決まった順番', () => {
    let s = createBattle(2, 2);
    s.allies.forEach((a) => (a.hp = a.maxHp = 9999));
    const seen: string[] = [];
    for (let t = 0; t < 6; t++) {
      seen.push(s.enemies[0].intent!.actionId);
      s = applyCommand(s, { type: 'END_TURN' }).state;
      while (s.phase === 'enemy') s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    }
    expect(seen).toEqual(['slam', 'brace', 'bigSwing', 'slam', 'brace', 'bigSwing']);
  });
  it('シャーマンは同じ行動を2連続しない / 斥候は3連続しない', () => {
    let s = createBattle(77, 2);
    s.allies.forEach((a) => (a.hp = a.maxHp = 99999));
    const shaman: string[] = [];
    const scout: string[] = [];
    for (let t = 0; t < 60; t++) {
      shaman.push(s.enemies[1].intent!.actionId);
      scout.push(s.enemies[2].intent!.actionId);
      s = applyCommand(s, { type: 'END_TURN' }).state;
      while (s.phase === 'enemy') s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    }
    for (let i = 1; i < shaman.length; i++) expect(shaman[i]).not.toBe(shaman[i - 1]);
    for (let i = 2; i < scout.length; i++) expect(scout[i] === scout[i - 1] && scout[i] === scout[i - 2]).toBe(false);
  });
  it('シャーマン単独なら「守護の印」は「混沌の波」になる', () => {
    let s = createBattle(8, 2);
    s.allies.forEach((a) => (a.hp = a.maxHp = 99999));
    s.enemies[0].dead = true;
    s.enemies[2].dead = true;
    s.enemies[0].intent = s.enemies[2].intent = undefined;
    const seen = new Set<string>();
    for (let t = 0; t < 30; t++) {
      s = applyCommand(s, { type: 'END_TURN' }).state;
      while (s.phase === 'enemy') s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
      seen.add(s.enemies[1].intent!.actionId);
    }
    expect(seen.has('ward')).toBe(false);
  });
});
