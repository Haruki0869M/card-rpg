import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CARDS, getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ITEMS } from '../../data/items';
import { applyCommand, cardRewardOdds, chestOdds, createBattle, createGame, createRng, rollCardOffers, rollGrade, tierDamageAgainst, toPartyMember } from '../index';
import { END, giveHand, play, setup } from './helpers';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

describe('宝箱の中身の格の確率（spec §10.2〜10.3）', () => {
  it('どの箱・どの成功数でも合計100%。成功が多いほどエピック以上が出やすい', () => {
    for (const look of ['common', 'rare', 'epic', 'legend'] as const) {
      let prev = -1;
      for (let s = 0; s <= BALANCE.chestLuckSlots; s++) {
        const o = chestOdds(look, s);
        expect(sum(o)).toBeCloseTo(100, 6);
        const high = o[2] + o[3];
        expect(high).toBeGreaterThan(prev);
        prev = high;
      }
    }
    // 成功0なら表どおり
    expect(chestOdds('common', 0)).toEqual([88, 10, 1.8, 0.2].map((v) => expect.closeTo(v, 6)));
    // 黄金箱はコモンが出ない
    expect(chestOdds('legend', 3)[0]).toBe(0);
  });
  it('抽選は表示した確率どおり（木箱・成功0で1万回）', () => {
    const rng = createRng(42);
    const odds = chestOdds('common', 0);
    const n = { common: 0, rare: 0, epic: 0, legend: 0 };
    for (let i = 0; i < 10000; i++) n[rollGrade(odds, rng)]++;
    expect(n.common / 100).toBeGreaterThan(86);
    expect(n.common / 100).toBeLessThan(90);
    expect(n.rare / 100).toBeGreaterThan(9);
    expect(n.rare / 100).toBeLessThan(11.2);
    expect(n.epic + n.legend).toBeLessThan(400);
  });
  it('確率0%の格は絶対に出ない', () => {
    const rng = createRng(7);
    const odds = chestOdds('legend', 0);
    for (let i = 0; i < 3000; i++) expect(rollGrade(odds, rng)).not.toBe('common');
  });
});

describe('カード報酬のレア度（spec §13）', () => {
  it('確率は部屋の種類ごと。合計100%', () => {
    for (const t of ['battle', 'elite', 'boss']) expect(sum(cardRewardOdds(t))).toBeCloseTo(100);
    expect(cardRewardOdds('boss')[2]).toBeGreaterThan(cardRewardOdds('battle')[2]);
  });
  it('エピックのカードがときどき出る（通常の戦闘でおよそ4%）', () => {
    const g = createGame({ seed: 1, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
    const rng = createRng(3);
    let epic = 0;
    let total = 0;
    for (let i = 0; i < 2000; i++) {
      for (const o of rollCardOffers(g, ['h0'], rng)) {
        total++;
        if (getCard(o.cardId).rarity === 'epic') epic++;
      }
    }
    expect(epic / total).toBeGreaterThan(0.02);
    expect(epic / total).toBeLessThan(0.07);
  });
  it('どの職業にもエピックのカードが2枚以上ある', () => {
    for (const c of CLASSES.all) expect(c.cardPool.filter((id) => CARDS.get(id).rarity === 'epic').length).toBeGreaterThanOrEqual(2);
  });
});

describe('エピック以上の特殊能力（spec §12.7・§13.1）', () => {
  it('エピック以上の装備・カードは必ず特殊能力を持つ', () => {
    for (const i of ITEMS.all) if (i.slot !== 'consumable' && (i.rarity === 'epic' || i.rarity === 'legend')) expect(i.ability, i.id).toBeDefined();
    for (const c of CARDS.all) if (c.rarity === 'epic' || c.rarity === 'legend') expect(c.trait, c.id).toBeDefined();
  });
  it('装備の能力は戦闘に引き継がれる（ターン開始時のブロック）', () => {
    const g = createGame({ seed: 1, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
    const h = g.heroes[0];
    h.equipment.armor = { uid: 'x', itemId: 'mithrilMail' };
    const m = toPartyMember(h);
    expect(m.abilities).toEqual([{ name: '聖銀の守り', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 5 }] } }]);
    const s = createBattle({ ...setup(1, ['warrior']), party: [m] });
    // 開始時ブロック（startBlock 8）+ ターン開始の能力 5
    expect(s.allies[0].block).toBe(8 + 5);
    const after = applyCommand(s, END).state;
    if (!after.allies[0].dead && after.phase === 'ally') expect(after.allies[0].block).toBeGreaterThanOrEqual(5);
  });
  it('装備の能力: 完全成功でフォーカス+1（見切り）', () => {
    const s = createBattle(setup(5, ['warrior', 'mage']));
    s.allies[0].abilities = [{ name: '見切り', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }], do: [{ kind: 'gainFocus', amount: 1 }] } }];
    const focus = s.allies[0].focus;
    const [c] = giveHand(s, 'a0', ['strike']);
    const { state, events } = applyCommand(s, play('a0', c.uid, 'e0', 1));
    expect(state.allies[0].focus).toBe(focus - 1 + 1);
    expect(events.some((e) => e.type === 'ability' && e.name === '見切り')).toBe(true);
  });
  it('カードの能力: 貫通はブロックを無視する', () => {
    const s = createBattle(setup(5, ['warrior', 'mage']));
    s.enemies[0].block = 50;
    const hp = s.enemies[0].hp;
    s.allies[0].mana = 3;
    const [c] = giveHand(s, 'a0', ['armorBreak']);
    const { state, events } = applyCommand(s, play('a0', c.uid, 'e0', 2));
    expect(state.enemies[0].block).toBe(50);
    expect(hp - state.enemies[0].hp).toBeGreaterThanOrEqual(15);
    expect(events.some((e) => e.type === 'ability' && e.name === '貫通')).toBe(true);
  });
  it('カードの能力: 止めはHPが少ない敵へのダメージを増やす（予測にも反映）', () => {
    const s = createBattle(setup(5, ['hunter', 'mage']));
    const snipe = getCard('snipe');
    const e = s.enemies[0];
    const normal = tierDamageAgainst(s.allies[0], snipe, e);
    e.hp = Math.floor(e.maxHp * 0.3);
    const low = tierDamageAgainst(s.allies[0], snipe, e);
    expect(low[3]).toBe(normal[3] * 2);
  });
  it('カードの能力: 吸収はHPに与えたダメージの一部を回復する', () => {
    const s = createBattle(setup(5, ['mage', 'warrior']));
    s.enemies.forEach((x) => (x.hp = x.maxHp = 999));
    const a = s.allies[0];
    a.hp = 10;
    const [c] = giveHand(s, 'a0', ['soulDrain']);
    const { state } = applyCommand(s, play('a0', c.uid, 'e0', 2));
    const dealt = 999 - state.enemies[0].hp;
    expect(state.allies[0].hp).toBe(10 + Math.floor(dealt / 2));
  });
  it('カードの能力: 魔力還元は完全成功でマナが戻る', () => {
    const s = createBattle(setup(5, ['mage', 'warrior']));
    s.enemies.forEach((x) => (x.hp = x.maxHp = 999));
    s.allies[0].mana = 3;
    s.allies[0].focus = 3;
    const [c] = giveHand(s, 'a0', ['meteor']);
    const { state } = applyCommand(s, play('a0', c.uid, undefined, 3));
    expect(state.allies[0].mana).toBe(3 - 3 + 2);
  });
});
