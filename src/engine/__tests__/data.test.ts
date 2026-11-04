import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ENCOUNTERS, ENEMIES } from '../../data/enemies';
import { createRegistry } from '../../data/registry';
import type { ClassDef, EnemyDef } from '../../types';
import { applyCommand, createBattle } from '../index';
import { nextTurn, play } from './helpers';

describe('データの整合性', () => {
  it('職業: デッキのカードが存在し、能力値・名前がそろっている', () => {
    for (const c of CLASSES.all) {
      for (const d of c.deck) expect(CARDS.has(d.cardId), `${c.id}: ${d.cardId}`).toBe(true);
      expect(c.deck.reduce((n, d) => n + d.count, 0)).toBeGreaterThanOrEqual(BALANCE.drawPerTurn);
      for (const v of Object.values(c.stats)) expect(v).toBeGreaterThan(0);
      expect(c.names.male.length).toBeGreaterThan(0);
      expect(c.names.female.length).toBeGreaterThan(0);
      expect(c.baseMaxHp).toBeGreaterThan(0);
    }
  });
  it('カード: Tierが昇順で0成功から始まり、スロット数を超えない', () => {
    for (const c of CARDS.all) {
      expect(c.tiers[0].minSuccesses, c.id).toBe(0);
      for (let i = 1; i < c.tiers.length; i++) expect(c.tiers[i].minSuccesses).toBeGreaterThan(c.tiers[i - 1].minSuccesses);
      expect(c.tiers.at(-1)!.minSuccesses).toBeLessThanOrEqual(c.slots);
      expect(c.slots).toBeGreaterThanOrEqual(1);
    }
  });
  it('敵: 行動の参照先が存在する', () => {
    for (const e of ENEMIES.all) {
      const ids = new Set(e.actions.map((a) => a.id));
      expect(e.actions.length).toBeGreaterThan(0);
      if (e.firstActionId) expect(ids.has(e.firstActionId)).toBe(true);
      for (const a of e.actions) if (a.fallbackIfAloneId) expect(ids.has(a.fallbackIfAloneId)).toBe(true);
    }
  });
  it('遭遇: 敵が存在し1〜4体', () => {
    for (const enc of ENCOUNTERS.all) {
      expect(enc.enemies.length).toBeGreaterThanOrEqual(1);
      expect(enc.enemies.length).toBeLessThanOrEqual(BALANCE.maxEnemies);
      for (const e of enc.enemies) expect(ENEMIES.has(e.defId)).toBe(true);
    }
  });
  it('登録表: 同じIDの二重登録はエラー', () => {
    expect(() => createRegistry('x', [{ id: 'a' }, { id: 'a' }])).toThrow();
  });
});

describe('拡張性: データを1件足すだけで戦闘に登場する', () => {
  it('新しい職業と敵を登録して戦える', () => {
    const paladin: ClassDef = {
      ...CLASSES.get('guardian'),
      id: 'testPaladin',
      name: '聖騎士',
      stats: { str: 66, vit: 70, int: 50, per: 50, dex: 64, agi: 40, luk: 50 },
      battleAbility: {
        id: 'holy',
        name: '聖なる怒り',
        description: 'test',
        effect: { kind: 'damageMultiplier', multiplier: 2 },
      },
    };
    const golem: EnemyDef = {
      id: 'testGolem',
      name: '石像',
      icon: '🗿',
      maxHp: 40,
      baseLevel: 1,
      pattern: 'sequence',
      actions: [{ id: 'punch', name: '殴る', effects: [{ kind: 'attack', amount: 3, hits: 1, target: 'all' }] }],
    };
    CLASSES.register(paladin);
    ENEMIES.register(golem);

    let s = createBattle({
      seed: 4,
      party: [{ classId: 'testPaladin', gender: 'female', name: 'テスト', playerId: 'P1' }],
      encounter: { id: 't', name: 't', enemies: [{ defId: 'testGolem' }] },
    });
    expect(s.allies[0].classId).toBe('testPaladin');
    expect(s.enemies[0].maxHp).toBe(Math.floor(40 * 0.6));
    // 物理適性 (66-60)/2 = +3 → ストライク 83%
    const strike = s.allies[0].hand.find((c) => c.cardId === 'strike');
    if (strike) {
      const r = applyCommand(s, play('a0', strike.uid, 'e0', 1));
      expect(r.error).toBeUndefined();
      expect(r.state.enemies[0].hp).toBe(s.enemies[0].hp - 14); // 7 × 2
      s = r.state;
    }
    s = nextTurn(s);
    expect(s.turn).toBe(2);
  });
});
