// 憲章5（2026-11-12）: 職の名前の必殺技6枚に、その職にしか無い役割を付けた（docs/tasks/charter5-card-merge-plan.md §8）
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { ENEMIES } from '../../data/enemies';
import type { BattleState, Command } from '../../types';
import { cardCostOf } from '../abilities';
import { rollChanceFor } from '../battle/battle';
import { applyCommand, createBattle, createGame, toPartyMember } from '../index';

const wait = [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block' as const, amount: 0 }] }];
ENEMIES.register({ icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence', id: 'c5Idler', name: '確認用の置物', maxHp: 100000, actions: wait });

function battle(classes: string[], enemies = ['c5Idler']): BattleState {
  const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: 'P1' })) });
  const s = createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'c5', name: '確認', enemies: enemies.map((defId) => ({ defId })) } });
  for (const a of s.allies) { a.mana = 30; a.focus = 9; a.focusMax = Math.max(a.focusMax, 9); a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
let uid = 0;
function use(s: BattleState, cardId: string, focus: number | 'max' = 'max') {
  const a = s.allies[0], inst = { uid: `e${uid++}`, cardId };
  a.hand.push(inst);
  a.mana = Math.max(a.mana, 10);
  const card = getCard(cardId), f = focus === 'max' ? card.slots : focus;
  const cmd: Command = { type: 'PLAY_CARD', playerId: 'P1', characterId: a.id, cardInstanceId: inst.uid, targetId: card.target === 'enemy' ? s.enemies[0].uid : undefined, focusUsed: f };
  const r = applyCommand(s, cmd);
  expect(r.error, cardId).toBeUndefined();
  return r.state;
}
function nextTurn(s: BattleState) {
  let st = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state;
  for (let i = 0; st.phase === 'enemy' && i < 20; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}
const lost = (a: BattleState, b: BattleState, i = 0) => a.enemies[i].hp - b.enemies[i].hp;

describe('憲章5: 職の名前の必殺技6枚', () => {
  it('天剣（剣聖）: 完全成功で、このターン《二の太刀》をもう1回出せる', () => {
    // 天剣なし: 1枚目のストライクは《二の太刀》で2回、2枚目は1回
    const a0 = battle(['swordSaint']);
    const a1 = use(a0, 'strike'), a2 = use(a1, 'strike');
    const twice = lost(a0, a1), once = lost(a1, a2);
    expect(twice).toBeGreaterThan(once);
    // 天剣あり: ストライク（二の太刀）→ 天剣（もう1回ぶんを使って、天剣もくり返す）
    const b0 = battle(['swordSaint']);
    const b1 = use(b0, 'strike');
    expect(lost(b0, b1)).toBe(twice);
    const single = (() => { const x0 = battle(['warrior']); return lost(x0, use(x0, 'heavenBlade')); })();
    const b2 = use(b1, 'heavenBlade');
    expect(lost(b1, b2)).toBeGreaterThan(single);
    // 3枚目は、もうくり返さない（足せるのは1ターンに1回）
    const b3 = use(b2, 'strike');
    expect(lost(b2, b3)).toBe(once);
    const b4 = use(b3, 'heavenBlade');
    expect(lost(b3, b4)).toBeLessThan(lost(b1, b2));
  });
  it('天剣: 先に使っても、後の物理カード2枚が《二の太刀》になる', () => {
    const s0 = battle(['swordSaint']);
    const s1 = use(s0, 'heavenBlade'); // 天剣が《二の太刀》でくり返す（1回目）
    const s2 = use(s1, 'strike'); // もう1回（2回目）
    const s3 = use(s2, 'strike'); // ここからは1回
    expect(lost(s1, s2)).toBeGreaterThan(lost(s2, s3));
  });
  it('竜牙突き（竜騎士）: 完全成功で、《竜のブレス》がその場で1回出る。竜騎士でなければ出ない', () => {
    const s0 = battle(['dragoon'], ['c5Idler', 'c5Idler']);
    const s1 = use(s0, 'dragonDive');
    expect(lost(s0, s1, 1)).toBeGreaterThan(0);
    const miss = use(battle(['dragoon'], ['c5Idler', 'c5Idler']), 'dragonDive', 0);
    if (!miss.log.at(-1)!.text.includes('完全成功')) expect(miss.enemies[1].hp).toBe(miss.enemies[1].maxHp);
    const w0 = battle(['warrior'], ['c5Idler', 'c5Idler']);
    expect(lost(w0, use(w0, 'dragonDive'), 1)).toBe(0);
  });
  it('奥義・月下断（侍）: 《居合》の蓄えが4倍の時、全部の枠が成功する', () => {
    const s = battle(['samurai']);
    const card = getCard('samuraiMoon');
    expect(rollChanceFor(s.allies[0], card, 0, s.enemies[0], s)).toBeLessThan(100);
    s.allies[0].attackCharge = { multiplier: 2, category: 'physical' };
    expect(rollChanceFor(s.allies[0], card, 0, s.enemies[0], s)).toBeLessThan(100);
    s.allies[0].attackCharge = { multiplier: 4, category: 'physical' };
    expect(rollChanceFor(s.allies[0], card, 0, s.enemies[0], s)).toBe(100);
    const r = use(s, 'samuraiMoon', 0);
    expect(r.log.at(-1)!.text).toContain('完全成功');
  });
  it('天を貫く矢（弓聖）: フォーカスを使って完全成功したら、フォーカスが1つ戻る', () => {
    const s = battle(['bowSaint']);
    s.allies[0].focus = 5;
    const r = use(s, 'skyPiercer', 1); // 《必中》で全枠成功
    expect(r.allies[0].focus).toBe(5);
    // フォーカスを使わなければ、戻らない
    const n = battle(['bowSaint']);
    n.allies[0].focus = 5;
    expect(use(n, 'skyPiercer', 0).allies[0].focus).toBeLessThanOrEqual(5);
  });
  it('天下割り（覇王）: このカードで敵を倒すと、《覇気》が2段上がる。ほかのカードなら1段', () => {
    const s = battle(['overlord'], ['c5Idler', 'c5Idler']);
    s.enemies[0].hp = 1;
    expect(use(s, 'worldBreaker').allies[0].damageBonus).toBeCloseTo(0.2);
    const t = battle(['overlord'], ['c5Idler', 'c5Idler']);
    t.enemies[0].hp = 1;
    expect(use(t, 'strike').allies[0].damageBonus).toBeCloseTo(0.1);
    // 覇王でなければ、何も起きない
    const w = battle(['warrior'], ['c5Idler', 'c5Idler']);
    w.enemies[0].hp = 1;
    expect(use(w, 'worldBreaker').allies[0].damageBonus ?? 0).toBe(0);
  });
  it('竜牙（槍騎士）: 戦闘の1ターン目だけ、コスト3 → 1', () => {
    const s = battle(['lancer']);
    const card = getCard('dragonFang');
    expect(s.turn).toBe(1);
    expect(cardCostOf(s, s.allies[0], card).cost).toBe(1);
    const mana = s.allies[0].mana;
    expect(use(s, 'dragonFang', 0).allies[0].mana).toBe(mana - 1);
    const t2 = nextTurn(battle(['lancer']));
    expect(t2.turn).toBe(2);
    expect(cardCostOf(t2, t2.allies[0], card).cost).toBe(3);
  });
});
