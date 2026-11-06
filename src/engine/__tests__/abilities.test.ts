import { describe, expect, it } from 'vitest';
import { applyCommand, createBattle, damageModifiers, tierDamageAgainst } from '../index';
import type { AllyState, CardDef } from '../../types';

const damageMultiplierFor = (a: AllyState, c: CardDef) => damageModifiers(undefined, a, c, undefined);
import { getCard } from '../../data/cards';
import { END, giveHand, play, setup } from './helpers';

describe('職業の戦闘の特殊能力', () => {
  it('闘志: HP半分以下で物理ダメージ+25%（予測にも反映）', () => {
    const s = createBattle(setup(5, ['warrior', 'mage']));
    const w = s.allies[0];
    const strike = getCard('strike');
    expect(damageMultiplierFor(w, strike).multiplier).toBe(1);
    w.hp = 30; // 60の半分
    expect(damageMultiplierFor(w, strike).multiplier).toBe(1.25);
    expect(damageMultiplierFor(w, getCard('magicArrow')).multiplier).toBe(1);
    expect(tierDamageAgainst(w, strike, s.enemies[0])).toEqual([5, 8]); // 4*1.25=5, 7*1.25=8.75→8
    const [c] = giveHand(s, 'a0', ['strike']);
    const { state, events } = applyCommand(s, play('a0', c.uid, 'e0', 1));
    expect(state.enemies[0].hp).toBe(52 - 8);
    expect(events.some((e) => e.type === 'ability' && e.name === '闘志')).toBe(true);
  });

  it('魔力暴走: 魔法カードの完全成功で、ランダムな敵に追加5ダメージ', () => {
    const s = createBattle(setup(5, ['mage', 'warrior']));
    const [c] = giveHand(s, 'a0', ['magicArrow']);
    const { state, events } = applyCommand(s, play('a0', c.uid, 'e0', 1));
    const total = s.enemies.reduce((n, e) => n + e.hp, 0) - state.enemies.reduce((n, e) => n + e.hp, 0);
    expect(total).toBe(7 + 5);
    expect(events.some((e) => e.type === 'ability' && e.name === '魔力暴走')).toBe(true);
    expect(state.stats.abilityTriggers).toBe(1);
  });

  it('魔力暴走: 完全成功でなければ発動しない', () => {
    const s = createBattle(setup(5, ['mage', 'warrior']));
    s.enemies.forEach((e) => (e.hp = e.maxHp = 999));
    const [c] = giveHand(s, 'a0', ['guard']); // スキルなので対象外
    const { events } = applyCommand(s, play('a0', c.uid, undefined, 1));
    expect(events.some((e) => e.type === 'ability')).toBe(false);
  });

  it('急所狙い: ダメージカードの完全成功で脆弱1', () => {
    const s = createBattle(setup(5, ['hunter', 'warrior']));
    const [c] = giveHand(s, 'a0', ['strike']);
    const { state } = applyCommand(s, play('a0', c.uid, 'e0', 1));
    expect(state.enemies[0].statuses.vulnerable).toBe(1);
  });

  it('かばう: 致死ダメージを守護者が確率で肩代わり（発動率はおよそ30%）', () => {
    let covered = 0;
    const N = 400;
    for (let seed = 1; seed <= N; seed++) {
      const s = createBattle(setup(seed, ['mage', 'guardian']));
      s.enemies[0].intent = { actionId: 'bigSwing', targetId: 'a0' };
      s.enemies[1].intent = undefined;
      s.enemies[2].intent = undefined;
      s.allies[0].hp = 5;
      let st = applyCommand(s, END).state;
      st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
      if (!st.allies[0].dead) {
        covered++;
        expect(st.allies[1].hp).toBe(72 - 16);
      }
    }
    expect(covered / N).toBeGreaterThan(0.24);
    expect(covered / N).toBeLessThan(0.36);
  });

  it('かばう: 致死でないダメージでは発動しない', () => {
    const s = createBattle(setup(1, ['mage', 'guardian']));
    s.enemies[0].intent = { actionId: 'slam', targetId: 'a0' };
    s.enemies[1].intent = undefined;
    s.enemies[2].intent = undefined;
    let st = applyCommand(s, END).state;
    st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
    expect(st.allies[0].hp).toBe(42 - 10);
    expect(st.allies[1].hp).toBe(72);
  });
});
