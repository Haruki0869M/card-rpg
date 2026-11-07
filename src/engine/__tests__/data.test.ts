import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ENCOUNTERS, ENEMIES } from '../../data/enemies';
import { createRegistry } from '../../data/registry';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { ITEMS } from '../../data/items';
import type { ClassDef, EnemyDef } from '../../types';
import { applyCommand, createBattle } from '../index';
import { nextTurn, play } from './helpers';

/** 4段階（コモン〜レジェンド）がそろっている武器の種類 */
const FULL_WEAPON_TYPES = ['sword', 'staff', 'hammer', 'bow'];

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
  it('職業: 報酬カード・初期装備が存在し、武器の種類が合う', () => {
    for (const c of CLASSES.all) {
      for (const id of c.cardPool) expect(CARDS.has(id), `${c.id}: ${id}`).toBe(true);
      for (const id of Object.values(c.startingEquipment)) expect(ITEMS.has(id!), `${c.id}: ${id}`).toBe(true);
      // 最初の武器は、そのジョブが装備できる種類（得意か、使える）
      if (c.startingEquipment.weapon) expect([c.weaponType, ...(c.subWeapons ?? [])]).toContain(ITEMS.get(c.startingEquipment.weapon).weaponType);
      // 武器が4段階そろっている（転職で増えた種類は、武器を増やす第3弾でそろえる）
      if (!FULL_WEAPON_TYPES.includes(c.weaponType)) continue;
      const rar = ITEMS.all.filter((i) => i.weaponType === c.weaponType).map((i) => i.rarity);
      expect(new Set(rar)).toEqual(new Set(['common', 'rare', 'epic', 'legend']));
    }
  });
  it('アイテム: 武器のカードが存在し、消費アイテムには効果がある', () => {
    for (const i of ITEMS.all) {
      for (const c of i.cards ?? []) expect(CARDS.has(c.cardId), `${i.id}: ${c.cardId}`).toBe(true);
      if (i.slot === 'consumable') expect(i.use).toBeDefined();
      if (i.slot === 'weapon') expect(i.weaponType).toBeDefined();
    }
  });
  it('ダンジョン: 敵・イベントが存在し、部屋のつながりが正しい', () => {
    for (const d of DUNGEONS.all) {
      for (const g of [...d.pools.battle, ...d.pools.elite, d.pools.boss]) for (const id of g) expect(ENEMIES.has(id), `${d.id}: ${id}`).toBe(true);
      if (d.layout) {
        d.layout.forEach((row, r) =>
          row.forEach((room) => {
            for (const n of room.next) expect(n).toBeLessThan(d.layout![r + 1].length);
            if (room.eventId) expect(EVENTS.has(room.eventId)).toBe(true);
            if (r < d.layout!.length - 1) expect(room.next.length).toBeGreaterThan(0);
          }),
        );
        expect(d.layout.at(-1)![0].type).toBe('boss');
      }
    }
  });
  it('敵: 段階の行動もそろっている', () => {
    for (const e of ENEMIES.all) for (const p of e.phases ?? []) expect(p.actions.length).toBeGreaterThan(0);
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
      battleAbility: { name: '聖なる怒り', effect: { modifier: 'damageDealt', multiplier: 2 } },
    };
    const golem: EnemyDef = {
      id: 'testGolem',
      name: '石像',
      icon: '🗿',
      maxHp: 40,
      baseLevel: 1,
      exp: 1,
      gold: 1,
      pattern: 'sequence',
      actions: [{ id: 'punch', name: '殴る', effects: [{ kind: 'damage', amount: 3, to: 'foes' }] }],
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
