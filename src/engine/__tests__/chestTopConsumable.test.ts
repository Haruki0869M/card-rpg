// 宝箱の中身がレジェンド → レジェンドの消耗品が必ず1つ・エピック → 25% でエピックの消耗品（点検 2026-11-13 F2）
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { ITEMS } from '../../data/items';
import type { PlayerId, Rarity } from '../../types';
import { createGame } from '../index';
import { rollChestContents } from '../game/loot';
import { createRng } from '../rng';

const G = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' as PlayerId }] });
const game = () => G;
const consumablesOf = (grade: Rarity, big: boolean, seed: number) =>
  rollChestContents(game(), grade, big, createRng(seed)).flatMap((l) => (l.kind === 'item' ? [ITEMS.get(l.item.itemId)] : [])).filter((d) => d.slot === 'consumable');

describe('宝箱の中身の格と消耗品', () => {
  it('数値は balance.ts', () => {
    expect(BALANCE.chestTopConsumable).toEqual({ epic: 25, legend: 100 });
  });

  it('レジェンド: ふつうの宝箱も黄金箱も、レジェンドの消耗品（神酒・不死鳥の羽根・砂時計）が必ず1つ。装備も必ず付く', () => {
    const seen = new Set<string>();
    for (const big of [false, true]) {
      for (let seed = 1; seed <= 300; seed++) {
        const loot = rollChestContents(game(), 'legend', big, createRng(seed));
        const items = loot.flatMap((l) => (l.kind === 'item' ? [ITEMS.get(l.item.itemId)] : []));
        expect(items.some((d) => d.slot !== 'consumable'), `seed${seed}`).toBe(true);
        const legends = items.filter((d) => d.slot === 'consumable' && d.rarity === 'legend');
        expect(legends, `seed${seed}`).toHaveLength(1);
        seen.add(legends[0].id);
      }
    }
    expect([...seen].sort()).toEqual(['divineNectar', 'phoenixFeather', 'timeHourglass']);
  });

  it('エピック: エピックの消耗品が付くのは、だいたい 25%', () => {
    let n = 0;
    const N = 2000;
    for (let seed = 1; seed <= N; seed++) if (consumablesOf('epic', false, seed).some((d) => d.rarity === 'epic')) n++;
    expect(n / N).toBeGreaterThan(0.21);
    expect(n / N).toBeLessThan(0.29);
  });

  it('コモン・レア: エピック以上の消耗品は付かない', () => {
    for (const g of ['common', 'rare'] as const) for (let seed = 1; seed <= 300; seed++) expect(consumablesOf(g, false, seed).every((d) => d.rarity === 'common' || d.rarity === 'rare')).toBe(true);
  });
});
