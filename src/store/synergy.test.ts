// Step C: 重なりの段階（完全成功・連携・ジョブの能力）の決め方と、表示のコマへの載せ方
import { describe, expect, it } from 'vitest';
import { applyCommand, createBattle } from '../engine';
import { giveHand, play, setup } from '../engine/__tests__/helpers';
import type { BattleEvent } from '../types';
import { battleFrames, synergyOf } from './presentation';

const allies = new Set(['a0', 'a1']);
const roll = (perfect: boolean, characterId = 'a0'): BattleEvent => ({ type: 'roll', characterId, cardId: 'strike', targetId: 'e0', chance: 80, results: perfect ? ['hit', 'hit'] : ['hit', 'miss'], successes: perfect ? 2 : 1, perfect, summary: '確認' });
const hit: Extract<BattleEvent, { type: 'damage' }> = { type: 'damage', unitId: 'e0', sourceId: 'a0', amount: 12, blocked: 0 };
const combo: BattleEvent = { type: 'ability', unitId: 'a0', name: '連携', source: { kind: 'other' } };
const job = (name = '剛力', kind: 'job' | 'inherited' = 'job'): Extract<BattleEvent, { type: 'ability' }> => ({ type: 'ability', unitId: 'a0', name, source: { kind, id: 'warrior', label: '戦士' } });
const pet: BattleEvent = { type: 'ability', unitId: 'a0', name: '見切り', source: { kind: 'pet', id: 'owl', label: 'ホー' } };

describe('重なりの段階（Step C）', () => {
  it('段階1: いつもの完全成功だけ（演出は今までどおり）', () => {
    expect(synergyOf([roll(true), hit], allies).tier).toBe(1);
    expect(battleFrames([roll(true), hit], allies).flatMap((f) => f.popups ?? []).every((p) => !p.tier)).toBe(true);
  });
  it('段階2: 完全成功＋連携、または完全成功＋ジョブの能力', () => {
    expect(synergyOf([roll(true), hit, combo], allies)).toMatchObject({ tier: 2, layers: 2, combo: true });
    expect(synergyOf([roll(true), hit, job()], allies)).toMatchObject({ tier: 2, layers: 2, jobAbilities: ['剛力'] });
    // 引き継いだ前のジョブの能力も数える
    expect(synergyOf([roll(true), hit, job('見切り', 'inherited')], allies).tier).toBe(2);
  });
  it('段階3: 3つ以上の重なり（完全成功＋連携＋ジョブの能力、ジョブの能力2つ）', () => {
    expect(synergyOf([roll(true), hit, combo, job()], allies)).toMatchObject({ tier: 3, layers: 3 });
    expect(synergyOf([roll(true), hit, job('剛力'), job('見切り', 'inherited')], allies).tier).toBe(3);
    expect(synergyOf([roll(true), hit, combo, job(), job('見切り', 'inherited')], allies)).toMatchObject({ tier: 3, layers: 4 });
  });
  it('完全成功でない・敵にダメージが無い・敵の行動・お供の能力だけ、は段階に入らない', () => {
    expect(synergyOf([roll(false), hit, combo, job()], allies).tier).toBe(0);
    expect(synergyOf([roll(true), combo, job()], allies).tier).toBe(0);
    expect(synergyOf([roll(true), { ...hit, unitId: 'a1' }, combo, job()], allies).tier).toBe(0);
    expect(synergyOf([roll(true), hit, pet], allies).tier).toBe(1);
    // 同じ能力が何度出ても1つと数える・ほかの仲間の能力は数えない
    expect(synergyOf([roll(true), hit, job(), job()], allies).tier).toBe(2);
    expect(synergyOf([roll(true), hit, { ...job('鼓舞'), unitId: 'a1' }], allies).tier).toBe(1);
  });
  it('段階2以上は、敵へのダメージの数字に段階を付け、最初のコマで揺れ・輪を始める。音は連携・能力で鳴る', () => {
    const events = [roll(true), hit, { ...hit, amount: 5 }, combo, job()], before = structuredClone(events);
    const frames = battleFrames(events, allies);
    const dmg = frames.flatMap((f) => f.popups ?? []).filter((p) => p.tone === 'damage');
    expect(dmg.map((p) => p.tier)).toEqual([3, 3]);
    expect(frames.filter((f) => f.synergy).map((f) => f.synergy)).toEqual([3]);
    const sounds = frames.flatMap((f) => f.sounds ?? []);
    expect(sounds).toContain('sfx_battle_combo');
    expect(sounds).toContain('sfx_battle_ability');
    // ダメージの数字そのもの・入力の出来事は変えない
    expect(dmg.map((p) => p.text)).toEqual(['-12', '-5']);
    expect(events).toEqual(before);
  });
  it('味方が受けたダメージの数字には段階を付けない', () => {
    const frames = battleFrames([roll(true), hit, { type: 'damage', unitId: 'a0', sourceId: 'e0', amount: 3, blocked: 0 }, combo], allies);
    const ally = frames.flatMap((f) => f.popups ?? []).find((p) => p.unitId === 'a0');
    expect(ally?.tier).toBeUndefined();
  });
  it('本物の戦闘: フォーカスで完全成功＋連携なら段階2以上になる（ダメージの量は演出に関係なく同じ）', () => {
    const s = createBattle(setup(5));
    s.enemies[0].hp = s.enemies[0].maxHp = 999;
    s.enemies[0].hitBy = ['a1'];
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    const r = applyCommand(s, play('a0', card.uid, 'e0', 3));
    const ids = new Set(s.allies.map((a) => a.id));
    const info = synergyOf(r.events, ids);
    expect(info.combo).toBe(true);
    expect(info.tier).toBeGreaterThanOrEqual(2);
  });
});
