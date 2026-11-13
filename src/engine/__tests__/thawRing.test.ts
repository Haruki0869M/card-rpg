// 点検（2026-11-13・F5）: 雪解けの指輪（thawRing）は、凍結の罰（次のターンのマナ-1）を受ける前に凍結を治す
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { ENEMIES } from '../../data/enemies';
import type { BattleState, PlayerId } from '../../types';
import { createBattle, createGame, toPartyMember } from '../index';
import { nextTurn } from './helpers';

ENEMIES.register({ id: 'thawRingIdler', name: '確認用の置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 1 }] }] });

function battle(accessory?: string): BattleState {
  const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'female', name: '仲間1', playerId: 'P1' as PlayerId }] });
  if (accessory) g.heroes[0].equipment.accessory = { uid: 'x0c', itemId: accessory };
  return createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'thawRing', name: '確認', enemies: [{ defId: 'thawRingIdler' }] } });
}

describe('雪解けの指輪', () => {
  it('付けていないと、凍結で次のターンのマナ-1（比べるための元の動き）', () => {
    const s = battle();
    s.allies[0].statuses.freeze = 1;
    const t = nextTurn(s);
    expect(t.allies[0].mana).toBe(BALANCE.manaPerTurn - 1);
    expect(t.allies[0].statuses.freeze ?? 0).toBe(0);
  });
  it('付けていると、ターンの始めに凍結が治り、マナ-1 を受けない', () => {
    const s = battle('thawRing');
    s.allies[0].statuses.freeze = 1;
    const t = nextTurn(s);
    expect(t.allies[0].statuses.freeze ?? 0).toBe(0);
    expect(t.allies[0].mana).toBe(BALANCE.manaPerTurn);
    expect(t.log.some((l) => l.text.includes('雪解け'))).toBe(true);
  });
  it('凍結していないターンは、何も起きない', () => {
    const s = battle('thawRing');
    const t = nextTurn(s);
    expect(t.allies[0].mana).toBe(BALANCE.manaPerTurn);
    expect(t.log.some((l) => l.text.includes('雪解け'))).toBe(false);
  });
});
