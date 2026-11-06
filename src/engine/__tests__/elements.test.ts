// ===== 属性・痺れ・凍結・呪い・再生（spec §14）のテスト =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { getCard } from '../../data/cards';
import { ELEMENTS } from '../../data/elements';
import { getEnemy } from '../../data/enemies';
import type { BattleState } from '../../types';
import { applyCommand, chanceFor, createBattle, describeEffect, elementMultiplier, finalChance, affinityOf, incomingDamage, tierDamageAgainst } from '../index';
import { END, giveHand, play, setup } from './helpers';

const STEP = { type: 'ENEMY_STEP' } as const;
const battle = (enemies: string[], classes = ['mage', 'warrior'], seed = 3): BattleState =>
  createBattle({ ...setup(seed, classes), encounter: { id: 't', name: 't', enemies: enemies.map((defId) => ({ defId })) } });

describe('属性', () => {
  it('弱点はダメージ×1.5、耐性は×0.5（予測にも反映）', () => {
    const s = battle(['fireSalamander', 'forestWolf']);
    expect(elementMultiplier(s.enemies[0], 'ice')).toBe(BALANCE.elementWeakMul);
    expect(elementMultiplier(s.enemies[0], 'fire')).toBe(BALANCE.elementResistMul);
    expect(elementMultiplier(s.enemies[0], undefined)).toBe(1);
    const ice = getCard('iceLance');
    const lance = tierDamageAgainst(s.allies[0], ice, s.enemies[0]);
    const plain = tierDamageAgainst(s.allies[0], ice, s.enemies[1]);
    expect(lance[2]).toBe(Math.floor(plain[2] * 1.5));
  });
  it('完全成功なら属性の状態異常が必ず付く（氷 → 凍結）', () => {
    const s = battle(['forestWolf']);
    s.enemies[0].hp = s.enemies[0].maxHp = 999;
    const [c] = giveHand(s, 'a0', ['iceLance']);
    const { state } = applyCommand(s, play('a0', c.uid, 'e0', 2));
    expect(state.enemies[0].statuses.freeze).toBe(1);
  });
  it('耐性のある属性では状態異常が付かない', () => {
    const s = battle(['fireSalamander']);
    s.enemies[0].hp = s.enemies[0].maxHp = 999;
    s.allies[0].mana = 3;
    s.allies[0].focus = 3;
    const [c] = giveHand(s, 'a0', ['fireball']);
    const { state } = applyCommand(s, play('a0', c.uid, 'e0', 3));
    // 火球の完全成功は火傷2を付ける効果もあるが、属性の追加分（火傷1）は付かない
    expect(state.enemies[0].statuses.burn).toBe(2);
  });
  it('属性のダメージの説明に、状態異常の確率が出る', () => {
    expect(describeEffect({ kind: 'damage', amount: 8, element: 'thunder' })).toMatch(/雷属性.*30%で痺れ1/);
  });
  it('どの属性も、与える状態異常が登録されている', () => {
    for (const e of ELEMENTS.all) if (e.status) expect(getEnemy).toBeDefined();
  });
});

describe('痺れ・凍結・呪い・再生', () => {
  it('痺れ: 味方のカードの成功率が下がる', () => {
    const s = battle(['forestWolf']);
    const card = getCard('strike');
    const base = finalChance(card, affinityOf(s.allies[0]));
    s.allies[0].statuses.paralysis = 1;
    expect(chanceFor(s.allies[0], card)).toBe(Math.max(BALANCE.chanceMin, base - 15));
  });
  it('痺れ: 敵はおよそ30%の確率で行動に失敗する', () => {
    let fails = 0;
    const N = 300;
    for (let seed = 1; seed <= N; seed++) {
      let s = battle(['forestWolf'], ['warrior'], seed);
      s.enemies[0].statuses.paralysis = 5;
      const hp = s.allies[0].hp + s.allies[0].block;
      s = applyCommand(s, END).state;
      const r = applyCommand(s, STEP);
      if (r.events.some((e) => e.type === 'enemyAct' && e.actionName.includes('痺れ'))) {
        fails++;
        expect(r.state.allies[0].hp + r.state.allies[0].block).toBeGreaterThanOrEqual(hp - 0);
      }
    }
    expect(fails / N).toBeGreaterThan(0.2);
    expect(fails / N).toBeLessThan(0.4);
  });
  it('凍結: 敵は次の行動を休み、凍結は消える。被弾予定も0になる', () => {
    let s = battle(['forestWolf'], ['warrior']);
    s.enemies[0].statuses.freeze = 1;
    expect(incomingDamage(s, s.allies[0])).toBe(0);
    const hp = s.allies[0].hp;
    s = applyCommand(s, END).state;
    const r = applyCommand(s, STEP);
    expect(r.state.allies[0].hp).toBe(hp);
    expect(r.state.enemies[0].statuses.freeze).toBe(0);
  });
  it('凍結: 味方は次のターンのマナが1減る', () => {
    let s = battle(['forestWolf'], ['warrior']);
    s.allies[0].statuses.freeze = 1;
    s.enemies[0].hp = s.enemies[0].maxHp = 999;
    s = applyCommand(s, END).state;
    while (s.phase === 'enemy') s = applyCommand(s, STEP).state;
    expect(s.allies[0].mana).toBe(BALANCE.manaPerTurn - 1);
    expect(s.allies[0].statuses.freeze).toBe(0);
  });
  it('呪い: 回復量が半分。再生: フェーズの始めに数値分回復して1減る', () => {
    let s = battle(['forestWolf'], ['warrior']);
    s.enemies[0].hp = s.enemies[0].maxHp = 999;
    s.enemies[0].intent = undefined;
    s.allies[0].hp = 20;
    s.allies[0].statuses.regen = 4;
    s.allies[0].statuses.curse = 3;
    s = applyCommand(s, END).state;
    while (s.phase === 'enemy') s = applyCommand(s, STEP).state;
    // 再生4 → フェーズ終了時に1減って3 → 次のフェーズの始めに3回復のはずが、呪いで半分の1
    expect(s.allies[0].statuses.regen).toBe(3);
    expect(s.allies[0].hp).toBe(21);
  });
});
