// 賢い bot の「ボスの弱点に合わせる」（weak。2026-11-13 docs/tasks/break-read-plan.md §4。測るための作戦で、ゲームは変えない）
import { describe, expect, it } from 'vitest';
import { getItem } from '../../data/items';
import { DUNGEONS } from '../../data/dungeons';
import { getEnemy } from '../../data/enemies';
import type { GameState, PlayerId } from '../../types';
import { createGame } from '../index';
import { equipGain, isPhysicalHero, newSmartMemo, smartGain, targetWeakOf } from '../botSmart';

const game = (classes: string[]): GameState => {
  const g = createGame({ seed: 5, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: 'P1' as PlayerId })) });
  g.party = g.heroes.map((h) => h.id);
  return g;
};

describe('賢い bot: ボスの弱点に合わせる装飾品', () => {
  it('剣士は物理、魔道士は物理ではない（最初の山札で見る）', () => {
    const g = game(['warrior', 'mage']);
    expect(isPhysicalHero(g.heroes[0])).toBe(true);
    expect(isPhysicalHero(g.heroes[1])).toBe(false);
  });

  it('何も分からない時は、合わせる弱点が無く、「属性の付与」は買わない（weak を外すと前と同じ点）', () => {
    const g = game(['warrior']);
    const sm = newSmartMemo();
    expect(targetWeakOf(g, sm)).toEqual([]);
    const ring = getItem('emberRing');
    expect(smartGain(g, sm, g.heroes[0], ring)).toBe(-Infinity);
    expect(smartGain(g, newSmartMemo(['weak']), g.heroes[0], ring)).toBe(equipGain(g.heroes[0], ring));
  });

  it('次の目的のダンジョンのボスと戦った事があれば、その弱点に合う物だけ点が上がる（合わない物は買わない）', () => {
    const g = game(['warrior']);
    const sm = newSmartMemo();
    const first = DUNGEONS.forScenario(g.scenarioId).filter((d) => !d.random && d.rewardKey && !d.finale).sort((a, b) => a.baseLevel - b.baseLevel)[0];
    const boss = first.pools.boss[0];
    const weak = getEnemy(boss).weak ?? [];
    expect(weak.length).toBeGreaterThan(0);
    sm.seenWeak.set(boss, weak);
    expect(targetWeakOf(g, sm)).toEqual(weak);
    const rings: Record<string, string> = { fire: 'emberRing', thunder: 'stormRing', ice: 'crystalNecklace', holy: 'meteorRing', dark: 'nightmareRing' };
    for (const [el, id] of Object.entries(rings)) {
      const def = getItem(id);
      if (weak.includes(el)) expect(smartGain(g, sm, g.heroes[0], def), id).toBeGreaterThan(equipGain(g.heroes[0], def));
      else expect(smartGain(g, sm, g.heroes[0], def), id).toBe(-Infinity);
    }
  });

  it('物理でないキャラは、今までどおりの点', () => {
    const g = game(['mage']);
    const sm = newSmartMemo();
    const ring = getItem('meteorRing');
    expect(smartGain(g, sm, g.heroes[0], ring)).toBe(equipGain(g.heroes[0], ring));
  });
});
