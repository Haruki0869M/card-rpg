// ===== シナリオの解放判定（K4-0 段1）のテスト =====
import { describe, expect, it } from 'vitest';
import { OPEN_ALL_SCENARIOS, SCENARIOS, getScenario, isScenarioUnlocked as rawUnlocked } from '../../data/scenarios';

// 解放の条件そのものの決まりは、全部開ける設定（OPEN_ALL_SCENARIOS）を外して確かめる
const isScenarioUnlocked = (sc: Parameters<typeof rawUnlocked>[0], cleared?: readonly string[]) => rawUnlocked(sc, cleared, false);
import { createGame } from '../index';
import { playToEnd } from '../bot';

const base = { unlocked: false } as const;

describe('シナリオの解放判定', () => {
  it('記録が無い間は従来の unlocked で決まる（条件があっても無視）', () => {
    expect(isScenarioUnlocked({ unlocked: true })).toBe(true);
    expect(isScenarioUnlocked({ ...base })).toBe(false);
    expect(isScenarioUnlocked({ ...base, unlockRequires: { cleared: ['a'] } })).toBe(false);
    expect(isScenarioUnlocked({ unlocked: true, unlockRequires: { cleared: ['a'] } })).toBe(true);
  });
  it('記録がある時は、条件のシナリオを全部クリアしていれば解放', () => {
    const sc = { ...base, unlockRequires: { cleared: ['a', 'b'] } };
    expect(isScenarioUnlocked(sc, [])).toBe(false);
    expect(isScenarioUnlocked(sc, ['a'])).toBe(false);
    expect(isScenarioUnlocked(sc, ['b', 'a', 'c'])).toBe(true);
  });
  it('条件が無いシナリオは、記録があっても unlocked のまま', () => {
    expect(isScenarioUnlocked({ unlocked: true }, [])).toBe(true);
    expect(isScenarioUnlocked({ ...base }, ['a'])).toBe(false);
  });
  it('今の登録済みシナリオ: 1本目は遊べ、凍てつく王国は1本目のクリアで解放される', () => {
    expect(isScenarioUnlocked(getScenario('corruptionKing'))).toBe(true);
    expect(isScenarioUnlocked(getScenario('corruptionKing'), [])).toBe(true);
    for (const s of SCENARIOS.all) expect(isScenarioUnlocked(s)).toBe(s.unlocked);
    const frozen = getScenario('frozenKingdom');
    expect(isScenarioUnlocked(frozen, [])).toBe(false);
    expect(isScenarioUnlocked(frozen, ['frozenKingdom'])).toBe(false);
    expect(isScenarioUnlocked(frozen, ['corruptionKing'])).toBe(true);
  });
});

describe('全部のシナリオを開ける設定（オーナーの決定 2026-11-16）', () => {
  it('OPEN_ALL_SCENARIOS が true の間は、クリアの記録が無くても全シナリオが遊べる。作成中（wip）は遊べない', () => {
    expect(OPEN_ALL_SCENARIOS).toBe(true);
    for (const s of SCENARIOS.all) {
      expect(rawUnlocked(s), s.id).toBe(!s.wip);
      expect(rawUnlocked(s, []), s.id).toBe(!s.wip);
    }
    expect(rawUnlocked({ unlocked: false, wip: true }, [])).toBe(false);
  });
});

describe('自動プレイの数え方', () => {
  it('部屋数を数えるだけで、1本目の結果（同じ種）は変わらない', () => {
    const mk = () => createGame({ seed: 1001, scenarioId: 'corruptionKing', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: c + i, playerId: 'P1' as const })) });
    const a = playToEnd(mk());
    const b = playToEnd(mk());
    expect(a.game).toEqual(b.game);
    expect(a.log.errors).toEqual([]);
    expect(a.log.rooms ?? 0).toBeGreaterThan(0);
    expect(a.game.stats.battlesWon).toBeGreaterThan(0);
  }, 120_000);
});
