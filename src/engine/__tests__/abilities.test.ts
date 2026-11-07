import { describe, expect, it } from 'vitest';
import { applyCommand, createBattle, damageModifiers } from '../index';
import type { AllyState, CardDef } from '../../types';

const damageMultiplierFor = (a: AllyState, c: CardDef) => damageModifiers(undefined, a, c, undefined);
import { getCard } from '../../data/cards';
import { END, giveHand, nextTurn, play, setup } from './helpers';

describe('職業の戦闘の特殊能力', () => {
  it('剣の心得（剣士）: 物理カードの完全成功でダメージ+30%', () => {
    const s = createBattle(setup(5, ['warrior', 'mage']));
    const w = s.allies[0];
    const strike = getCard('strike');
    expect(damageMultiplierFor(w, strike).multiplier).toBe(1);
    const [c] = giveHand(s, 'a0', ['strike']);
    const { state, events } = applyCommand(s, play('a0', c.uid, 'e0', 1));
    expect(state.enemies[0].hp).toBe(52 - 9); // 7 × 1.3 = 9.1
    expect(events.some((e) => e.type === 'ability' && e.name === '剣の心得')).toBe(true);
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

describe('基本ジョブの特殊能力（spec §6.4）', () => {
  it('連撃（武闘家）: そのターンの2枚目からの物理ダメージ+25%', () => {
    const s = createBattle(setup(5, ['monk', 'mage']));
    s.enemies[0].hp = s.enemies[0].maxHp = 999;
    const hand = giveHand(s, 'a0', ['wQuickStab', 'wQuickStab']);
    let r = applyCommand(s, play('a0', hand[0].uid, 'e0', 1));
    const first = 999 - r.state.enemies[0].hp;
    r = applyCommand(r.state, play('a0', hand[1].uid, 'e0', 1));
    const second = 999 - first - r.state.enemies[0].hp;
    expect(first).toBe(4);
    expect(second).toBe(5); // 4 × 1.25
  });
  it('幻獣ゲージ（召喚士）: 魔法カード3回ごとに幻獣がランダムな敵へ9ダメージ', () => {
    const s = createBattle(setup(5, ['summoner', 'mage']));
    s.allies[0].mana = 9;
    s.enemies.forEach((e) => (e.hp = e.maxHp = 999));
    const hand = giveHand(s, 'a0', ['phantomClaw', 'phantomClaw', 'phantomClaw']);
    let st = s;
    const fired: boolean[] = [];
    for (const c of hand) {
      const r = applyCommand(st, play('a0', c.uid, 'e0', 0));
      fired.push(r.events.some((e) => e.type === 'ability' && e.name === '幻獣ゲージ'));
      st = r.state;
    }
    expect(fired).toEqual([false, false, true]);
  });
  it('癒しの祈り（僧侶）: ターンの初めに、HPの割合が一番低い味方を3回復', () => {
    const s = createBattle(setup(5, ['priest', 'warrior']));
    s.enemies.forEach((e) => (e.attackMul = 0)); // 敵の攻撃は0ダメージに
    s.allies[1].hp = 10;
    const st = nextTurn(s);
    expect(st.allies[1].hp).toBe(13);
    expect(st.allies[0].hp).toBe(st.allies[0].maxHp);
  });
  it('盗む（盗賊）: 攻撃した敵のブロックを奪って、自分のブロックにする', () => {
    const s = createBattle(setup(5, ['thief', 'mage']));
    s.enemies[0].block = 10;
    s.enemies[0].hp = s.enemies[0].maxHp = 999;
    const [c] = giveHand(s, 'a0', ['wQuickStab']);
    const r = applyCommand(s, play('a0', c.uid, 'e0', 1));
    // 4ダメージでブロックが6に減り、そこから3を盗む
    expect(r.state.allies[0].block).toBe(3);
    expect(r.state.enemies[0].block).toBe(3);
  });
});
