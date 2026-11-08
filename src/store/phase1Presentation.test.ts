// フェーズ1（戦闘の見やすさ・テンポ）: 敵1体ずつの間、帯と数字の順番、結果の帯の文
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TIMING } from '../data/balance';
import { applyCommand, createBattle, createGame, stateHash, toPartyMember } from '../engine';
import { resultSummary } from '../engine/battle/battle';
import { useBattle } from './battleStore';

vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
});

function setup(enemies = 3, fastMode = false) {
  vi.useFakeTimers();
  const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', name: 'レオン', gender: 'male', playerId: 'P1' }] });
  g.mode = 'battle'; g.party = g.heroes.map((h) => h.id);
  g.battle = createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'test', name: '確認', enemies: Array.from({ length: enemies }, () => ({ defId: 'forestWolf' })) } });
  useBattle.getState().setSettings({ fastMode, cutinMode: 'standard' });
  useBattle.getState().loadRemote(g);
  return g;
}
afterEach(() => { useBattle.getState().abandonGame(); vi.useRealTimers(); });

/** 0.1秒おきに、帯・数字・敵の行動（戦闘の状態が変わった時刻）を記録する */
function record(ms: number) {
  const rows: { t: number; banner?: string; popups: number; battle: unknown; phase: string }[] = [];
  for (let t = 0; t <= ms; t += 100) {
    const s = useBattle.getState();
    rows.push({ t, banner: s.phaseBanner?.phase, popups: s.popups.length, battle: s.full?.battle, phase: s.full?.battle?.phase ?? '' });
    vi.advanceTimersByTime(100);
  }
  return rows;
}

describe('敵の番のテンポと帯の順番', () => {
  it('敵は1体ずつ、前の数字が消えてから約0.4秒の間を取って動く。帯は数字と同時に出ない', () => {
    setup(3);
    vi.advanceTimersByTime(3000); // 「ターン 1」の帯を出し終える
    expect(useBattle.getState().dispatchGame({ type: 'BATTLE', command: { type: 'END_TURN', playerId: 'P1' } })).toBeUndefined();
    const rows = record(12000);
    // 帯と数字は同じ時に出ていない
    expect(rows.filter((r) => r.banner && r.popups > 0)).toEqual([]);
    // 「敵のターン」→「ターン 2」の順に帯が出た
    const banners = rows.map((r) => r.banner).filter((b, i, a) => b && b !== a[i - 1]);
    expect(banners).toEqual(['enemy', 'ally']);
    // 敵の行動（状態が変わった時刻）の間は、0.4秒以上あく
    const acts = rows.filter((r, i) => i > 0 && r.battle !== rows[i - 1].battle && rows[i - 1].phase === 'enemy').map((r) => r.t);
    expect(acts.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < acts.length; i++) expect(acts[i] - acts[i - 1]).toBeGreaterThanOrEqual(TIMING.enemyStep * 1000);
    // 「ターン 2」の帯は、最後の敵の数字が消えてから出る
    const lastPopup = Math.max(...rows.filter((r) => r.popups > 0).map((r) => r.t));
    const allyBanner = rows.find((r) => r.banner === 'ally')!.t;
    expect(allyBanner).toBeGreaterThan(lastPopup);
    expect(useBattle.getState().full!.battle!.phase).toBe('ally');
  });
  it('高速モードでは間が半分になり、結果（状態）は同じ', () => {
    setup(3, false); vi.advanceTimersByTime(3000);
    useBattle.getState().dispatchGame({ type: 'BATTLE', command: { type: 'END_TURN', playerId: 'P1' } });
    const normal = record(12000); const slowHash = stateHash(useBattle.getState().full);
    useBattle.getState().abandonGame();
    setup(3, true); vi.advanceTimersByTime(3000);
    useBattle.getState().dispatchGame({ type: 'BATTLE', command: { type: 'END_TURN', playerId: 'P1' } });
    const fast = record(12000);
    expect(stateHash(useBattle.getState().full)).toBe(slowHash);
    const doneAt = (rows: typeof normal) => rows.find((r) => r.phase === 'ally' && r.t > 0)!.t;
    expect(doneAt(fast)).toBeLessThan(doneAt(normal) * 0.7);
  });
});

describe('結果の帯の文', () => {
  it('日本語でそろえ、「・」でつなぐ。英語の DMG・BLOCK を使わない', () => {
    expect(resultSummary('完全成功', ['9ダメージ', '7ブロック'])).toBe('完全成功！ 9ダメージ・7ブロック');
    expect(resultSummary('1成功', [])).toBe('1成功！');
  });
  it('実際のカードの結果の文に DMG・BLOCK・お供の能力の名前が入らない', () => {
    const g = setup(1);
    for (const h of g.heroes) h.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴー', love: 0, acts: 0 };
    const b = createBattle({ seed: 3, party: g.heroes.map(toPartyMember), encounter: { id: 'test', name: '確認', enemies: [{ defId: 'forestWolf' }] } });
    const summaries: string[] = [];
    for (const inst of b.allies[0].hand) {
      const r = applyCommand(structuredClone(b), { type: 'PLAY_CARD', playerId: 'P1', characterId: b.allies[0].id, cardInstanceId: inst.uid, targetId: b.enemies[0].uid, focusUsed: 0 });
      const roll = r.events.find((e) => e.type === 'roll');
      if (roll?.type === 'roll') summaries.push(roll.summary);
    }
    expect(summaries.length).toBeGreaterThan(0);
    for (const t of summaries) {
      expect(t).toMatch(/成功！/);
      expect(t).not.toMatch(/DMG|BLOCK|ぴー/);
    }
  });
});
