import { describe, expect, it } from 'vitest';
import { CARDS } from '../data/cards';
import type { CardDef } from '../types';
import { cardSummary } from './format';

const card = (p: Partial<CardDef>): CardDef => ({ id: 'x', name: 'x', category: 'physical', cost: 1, slots: 2, baseChance: 60, target: 'enemy', tiers: [], ...p });

describe('カードのひとことの説明（フェーズ3）', () => {
  it('単体攻撃・全体攻撃・回復・ブロック・状態異常', () => {
    expect(cardSummary(card({ tiers: [{ minSuccesses: 1, effects: [{ kind: 'damage', amount: 6 } as never] }] }))).toBe('敵1体に物理ダメージ');
    expect(cardSummary(card({ category: 'magic', target: 'allEnemies', tiers: [{ minSuccesses: 1, effects: [{ kind: 'damage', amount: 4 } as never] }] }))).toBe('敵全体に魔法ダメージ');
    expect(cardSummary(card({ category: 'magic', target: 'ally', tiers: [{ minSuccesses: 1, effects: [{ kind: 'heal', amount: 8 } as never] }] }))).toBe('味方1人のHPを回復');
    expect(cardSummary(card({ target: 'enemy', tiers: [{ minSuccesses: 1, effects: [{ kind: 'damage', amount: 6 } as never, { kind: 'block', amount: 4, to: 'self' } as never] }] }))).toBe('敵1体に物理ダメージ・自分にブロック');
    expect(cardSummary(card({ target: 'self', tiers: [{ minSuccesses: 1, effects: [{ kind: 'block', amount: 6 } as never] }] }))).toBe('自分にブロック');
  });
  it('全部のカードで空にならず、数値が出ない・長すぎない', () => {
    for (const c of CARDS.all) {
      const t = cardSummary(c);
      expect(t.length, c.id).toBeGreaterThan(0);
      expect(t.length, `${c.id}: ${t}`).toBeLessThanOrEqual(60);
    }
  });
});
