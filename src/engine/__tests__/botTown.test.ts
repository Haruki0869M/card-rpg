// 宿屋はキャラ単位。同じ担当の2人目を回復せずに町へ戻り続けないこと。
import { describe, expect, it } from 'vitest';
import { applyGameCommand, createGame, heroMaxHp } from '../index';
import { botStep, type BotLog } from '../bot';

function visitTown(bothHurt = false) {
  const g = createGame({ seed: 1001, scenarioId: 'frozenKingdom', difficulty: 'normal', party: ['warrior', 'mage'].map((classId, i) => ({ classId, name: `仲間${i}`, gender: 'male' as const, playerId: 'P1' })) });
  g.world!.story = undefined;
  for (const [i, h] of g.heroes.entries()) {
    h.gold = 100;
    if (i === 1 || bothHurt) h.hp = Math.floor(heroMaxHp(h) / 3);
  }
  const r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: g.heroes[0].id, party: g.heroes.map(h => h.id) });
  expect(r.error).toBeUndefined();
  expect(r.state.mode).toBe('town');
  return r.state;
}

describe('自動プレイの宿泊', () => {
  it('先頭が健康でも、同じ担当の2人目を本人のお金で回復する', () => {
    const g = visitTown();
    const log: BotLog = { steps: 0, errors: [], modes: {} };
    const next = botStep(g, log, { interacted: new Set() });
    expect(next.heroes[0].gold).toBe(100);
    expect(next.heroes[1].gold).toBeLessThan(100);
    expect(next.heroes[1].hp).toBe(heroMaxHp(next.heroes[1]));
    expect(log.errors).toEqual([]);
  });

  it('2人とも回復してから町を出て、同じ町の入退場を繰り返さない', () => {
    let g = visitTown(true);
    const log: BotLog = { steps: 0, errors: [], modes: {} };
    const memo = { interacted: new Set<string>() };
    for (let i = 0; i < 6 && g.mode === 'town'; i++) g = botStep(g, log, memo);
    expect(g.mode).toBe('world');
    for (const h of g.heroes) expect(h.hp).toBe(heroMaxHp(h));
    expect(log.errors).toEqual([]);
  });
});
