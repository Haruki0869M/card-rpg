import { afterEach, describe, expect, it, vi } from 'vitest';
import { slotTiming } from './slotTiming';
import { TIMING } from '../data/balance';
import { applyGameCommand, createBattle, createGame, stateHash, toPartyMember } from '../engine';
import type { BattleEvent, GameCommand } from '../types';
import { useBattle } from './battleStore';

const storage = vi.hoisted(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
  return values;
});
const petNotice = (id = 'h0', name = '先読み'): BattleEvent => ({ type: 'ability', unitId: id, name: `ぴーの${name}`, source: { kind: 'pet', id: 'cockatiel', label: 'ぴー', effectName: name } });
function setup(count = 1) {
  vi.useFakeTimers();
  const g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: Array.from({ length: count }, (_, i) => ({ classId: 'warrior', name: `確認${i}`, gender: 'male' as const, playerId: 'P1' as const })) });
  for (const h of g.heroes) h.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴー', love: 0, acts: 0 };
  g.mode = 'battle'; g.party = g.heroes.map(h => h.id);
  g.battle = createBattle({ seed: 7, party: g.heroes.map(toPartyMember), encounter: { id: 'test', name: '確認', enemies: [{ defId: 'forestWolf' }] } });
  useBattle.getState().setSettings({ fastMode: false, cutinMode: 'standard' }); useBattle.getState().loadRemote(g);
  return g;
}
const wire: GameCommand = { type: 'BATTLE', command: { type: 'END_TURN', playerId: 'P1' } };
afterEach(() => { useBattle.getState().abandonGame(); vi.useRealTimers(); });
describe('表示専用タイマーと能力カットイン', () => {
  it('攻撃の動きの後に被弾が出て、表示タイマーはゲームの状態・乱数を変えない', () => {
    const g = setup(), hash = stateHash(g);
    const events: BattleEvent[] = [{ type: 'damage', sourceId: 'h0', unitId: 'e0', amount: 5, blocked: 0 }, { type: 'roll', characterId: 'h0', cardId: 'strike', targetId: 'e0', chance: 80, results: ['hit'], successes: 1, perfect: true, summary: '確認' }];
    useBattle.getState().applyRemote({ state: g, battleEvents: events }, wire);
    vi.advanceTimersByTime(1); expect(useBattle.getState().unitFx.h0.kind).toBe('attack'); expect(useBattle.getState().unitFx.e0).toBeUndefined();
    // 段階C（2026-11）: カードの効果は、スロットが全部止まってから出る（スロットの途中では、まだ被弾しない）
    const slot = slotTiming(['hit']).total;
    vi.advanceTimersByTime(TIMING.actionLead * 1000 + 1); expect(useBattle.getState().unitFx.e0).toBeUndefined();
    vi.advanceTimersByTime((slot - TIMING.actionLead) * 1000); expect(useBattle.getState().unitFx.e0.kind).toBe('hit');
    expect(useBattle.getState().popups.some(p => p.text === '-5')).toBe(true);
    vi.advanceTimersByTime(2000); expect(useBattle.getState().popups).toEqual([]); expect(useBattle.getState().presentationBusy).toBe(false);
    expect(stateHash(useBattle.getState().full)).toBe(hash);
  });
  it('お供はカットインと跳躍1回だけで、同じ発動を能力ラベルへ二重表示しない', () => {
    const g = setup(); useBattle.getState().applyRemote({ state: g, battleEvents: [petNotice(), petNotice()] }, wire);
    vi.advanceTimersByTime(1); const s = useBattle.getState();
    expect(s.cutins).toHaveLength(1); expect(s.cutins[0].count).toBe(2); expect(s.petPulses.h0).toBeDefined(); expect(s.popups).toEqual([]);
    vi.advanceTimersByTime(710); expect(useBattle.getState().cutins).toEqual([]); expect(useBattle.getState().petPulses).toEqual({});
  });
  it('4人のお供は2件ずつ全員分表示し、通知で戦闘を止めない', () => {
    const g = setup(4);
    // 戦闘の始めの「ターン 1」の帯を先に出し終えておく（帯は数字の表示が終わってから出る）
    useBattle.getState().applyRemote({ state: g, battleEvents: [] }, wire); vi.advanceTimersByTime(2000);
    expect(useBattle.getState().presentationBusy).toBe(false);
    useBattle.getState().applyRemote({ state: g, battleEvents: g.heroes.map(h => petNotice(h.id)) }, wire);
    vi.advanceTimersByTime(1); expect(useBattle.getState().cutins.map(n => n.unitId)).toEqual(['h0', 'h1']);
    vi.advanceTimersByTime(705); expect(useBattle.getState().cutins.map(n => n.unitId)).toEqual(['h2', 'h3']);
    expect(useBattle.getState().presentationBusy).toBe(false); expect(useBattle.getState().full!.battle!.phase).toBe('ally');
    vi.advanceTimersByTime(705); expect(useBattle.getState().cutins).toEqual([]);
  });
  it('引き継ぎはキャラの近くへラベル表示し、お供通知と区別する', () => {
    const g = setup(); useBattle.getState().applyRemote({ state: g, battleEvents: [{ type: 'ability', unitId: 'h0', name: '見切り', source: { kind: 'inherited', id: 'swordmaster', label: '剣豪' } }] }, wire);
    vi.advanceTimersByTime(1); expect(useBattle.getState().popups[0].text).toBe('【継承：見切り】'); expect(useBattle.getState().cutins).toEqual([]);
  });
  it('同じキャラの表示は3段以内で、先の表示が消えても段が重ならない', () => {
    const g = setup(); useBattle.getState().applyRemote({ state: g, battleEvents: Array.from({ length: 8 }, (_, i) => ({ type: 'block' as const, unitId: 'h0', amount: i + 1 })) }, wire);
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(50); const ps = useBattle.getState().popups;
      expect(ps.length).toBeLessThanOrEqual(3); expect(new Set(ps.map(p => p.lane)).size).toBe(ps.length);
    }
  });
  it('保存・再接続・場面切替で古いカットインや開幕効果を再生しない', () => {
    const g = setup(); useBattle.getState().applyRemote({ state: g, battleEvents: [petNotice()] }, wire); vi.advanceTimersByTime(1);
    expect(useBattle.getState().cutins).toHaveLength(1);
    useBattle.getState().loadRemote(JSON.parse(JSON.stringify(g))); vi.advanceTimersByTime(2000);
    expect(useBattle.getState().cutins).toEqual([]); expect(useBattle.getState().petPulses).toEqual({}); expect(useBattle.getState().popups).toEqual([]);
    useBattle.getState().applyRemote({ state: g, battleEvents: [petNotice()] }, wire); vi.advanceTimersByTime(1); useBattle.getState().setScene('world');
    expect(useBattle.getState().cutins).toEqual([]);
  });
  it('他の場面の戦闘イベントは、表示中の戦場に出さない', () => {
    const g = setup(); useBattle.getState().applyRemote({ state: g, battleEvents: [petNotice()] }, { type: 'SCENE', scene: '別の場面', command: wire });
    vi.advanceTimersByTime(2000); expect(useBattle.getState().cutins).toEqual([]);
  });
  it('簡易/高速でも結果が同じで、高速はカットインの表示時間が半分になる', () => {
    const g = setup(), hash = stateHash(g); useBattle.getState().setSettings({ fastMode: true, cutinMode: 'simple' });
    useBattle.getState().applyRemote({ state: g, battleEvents: [petNotice()] }, wire); vi.advanceTimersByTime(1);
    expect(useBattle.getState().cutins).toHaveLength(1); vi.advanceTimersByTime(360); expect(useBattle.getState().cutins).toEqual([]);
    expect(stateHash(useBattle.getState().full)).toBe(hash);
    const saved = JSON.parse(storage.get('card-rpg/settings')!); expect(saved).toMatchObject({ fastMode: true, cutinMode: 'simple' });
  });
  it('移動力のお供は操作確定時に1回だけ通知し、同じ判定は再送しても増えない', () => {
    const g = setup(); g.mode = 'world'; g.battle = undefined; g.world!.story = undefined; g.heroes[0].pet!.petId = 'rabbit'; g.heroes[0].pet!.color = 'white';
    useBattle.getState().loadRemote(g);
    const cmd = { type: 'WORLD_ROLL_MOVE' as const, playerId: 'P1' as const, heroId: 'h0' };
    const r = applyGameCommand(g, cmd); expect(r.error).toBeUndefined(); useBattle.getState().applyRemote(r, cmd);
    expect(useBattle.getState().cutins).toHaveLength(1); expect(useBattle.getState().cutins[0].name).toBe('移動力+1');
    expect(useBattle.getState().dispatchWire(cmd)).toBeTruthy(); expect(useBattle.getState().cutins).toHaveLength(1);
  });
});
