// 宿題3・宿題7（2026-11-14・docs/tasks/job-axes-plan.md）: どのジョブでも軸を2つ以上に。
// 魔力の結界・障壁の魔弾（魔の系統の重装）・逆境の刃を槍へ・黄金の錨と天使の羽衣をどこでも・満ち潮の杯・回復役がいない時の抽選
import { describe, expect, it } from 'vitest';
import { CARDS, getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ENEMIES } from '../../data/enemies';
import { getItem } from '../../data/items';
import type { BattleEvent, BattleState, Hero, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, toPartyMember } from '../index';
import { cardTags, healerlessWeight, partyHasHealer, pickCard } from '../game/cardTags';
import { heroCardPool } from '../game/jobs';
import { rollEquipment } from '../game/loot';
import { createRng } from '../rng';
import { giveHand } from './helpers';

ENEMIES.register({ id: 'axes1114Idler', name: '確認用の置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });
ENEMIES.register({ id: 'axes1114FireWeak', name: '確認用の火に弱い置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence', weak: ['fire'],
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });

type Gear = { armor?: string; accessory?: string };
function battle(classIds: string[], gear: Gear = {}, enemy = 'axes1114Idler'): BattleState {
  const g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: classIds.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: 'P1' as PlayerId })) });
  const h = g.heroes[0];
  if (gear.armor) h.equipment.armor = { uid: 'xa', itemId: gear.armor };
  if (gear.accessory) h.equipment.accessory = { uid: 'xc', itemId: gear.accessory };
  return createBattle({ seed: 7, party: g.heroes.map(toPartyMember), encounter: { id: 'axes1114', name: '確認', enemies: [{ defId: enemy }] } });
}
function use(s: BattleState, cardId: string, mana = 10) {
  const a = s.allies[0];
  const card = getCard(cardId);
  giveHand(s, a.id, [cardId]);
  a.mana = mana;
  a.focus = 6;
  const r = applyCommand(s, { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: 't0', focusUsed: card.slots, targetId: card.target === 'enemy' ? s.enemies[0].uid : card.target === 'ally' ? a.id : undefined });
  expect(r.error, `${cardId}: ${r.error}`).toBeUndefined();
  return r.state;
}
function endTurn(s: BattleState) {
  const events: BattleEvent[] = [];
  let r = applyCommand(s, { type: 'END_TURN', playerId: 'P1' as PlayerId });
  events.push(...r.events);
  let guard = 0;
  while (r.state.phase === 'enemy' && guard++ < 20) { r = applyCommand(r.state, { type: 'ENEMY_STEP' }); events.push(...r.events); }
  expect(r.state.phase).toBe('ally');
  return { state: r.state, events };
}

describe('魔力の結界（魔の系統の重装・貯める側）', () => {
  it('ターンの終わりに、残ったマナ1につきブロック5（最大18）。マナは使い切り、ブロックは次のターンへ残る', () => {
    const s = use(battle(['mage']), 'axManaWard', 3); // 使って残り2
    const a = s.allies[0];
    expect(a.mana).toBe(2);
    expect(a.block).toBe(4);
    const r = endTurn(s);
    // 4 + 2×5 = 14 が、次のターンに残る（ふつうの上限25の中）
    expect(r.state.allies[0].block).toBe(14);
    expect(r.state.allies[0].mana).toBe(3);
  });
  it('残ったマナが多くても、結界のブロックは18まで', () => {
    const r = endTurn(use(battle(['mage']), 'axManaWard', 10));
    expect(r.state.allies[0].block).toBe(4 + 18);
  });
  it('マナを使い切ったら、結界のブロックは増えない（札のブロックだけ残る）', () => {
    const r = endTurn(use(battle(['mage']), 'axManaWard', 1));
    expect(r.state.allies[0].block).toBe(4);
  });
  it('魔の系統の11職すべての候補に入り、ほかの系統には入らない', () => {
    for (const j of CLASSES.all) expect(heroCardPool({ classId: j.id, jobs: [], deck: [], equipment: {} } as unknown as Hero, false).includes('axManaWard'), j.id).toBe(j.lineage === 'ma');
  });
});

describe('障壁の魔弾（魔の系統の重装・撃つ側）', () => {
  it('今のブロックの110%のダメージ（ブロックは減らない）', () => {
    const s = battle(['mage']);
    s.allies[0].block = 20;
    const r = use(s, 'axWardBolt');
    expect(r.allies[0].block).toBe(20);
    expect(r.enemies[0].maxHp - r.enemies[0].hp).toBeGreaterThanOrEqual(20);
  });
  it('属性の無い時は、狙った敵の弱点の属性になり、弱点で大きくなる', () => {
    const plain = battle(['mage']);
    plain.allies[0].block = 20;
    const weak = battle(['mage'], {}, 'axes1114FireWeak');
    weak.allies[0].block = 20;
    const a = use(plain, 'axWardBolt').enemies[0];
    const b = use(weak, 'axWardBolt').enemies[0];
    expect(b.maxHp - b.hp).toBeGreaterThan(a.maxHp - a.hp);
  });
  it('ブロックが無ければ何も起きない', () => {
    const s = battle(['timeMage']); // 魔道士は《魔力暴走》（魔法の完全成功で5ダメージ）があるので、時魔道士で
    s.allies[0].block = 0;
    const r = use(s, 'axWardBolt');
    expect(r.enemies[0].hp).toBe(r.enemies[0].maxHp);
  });
});

describe('逆境の刃を槍へ（槍の道の背水）', () => {
  it('槍の職の候補に入る（効果は変えない）', () => {
    for (const id of ['guardian', 'lancer', 'dragoon', 'bulwark']) expect(heroCardPool({ classId: id, jobs: [], deck: [], equipment: {} } as unknown as Hero, false), id).toContain('axAdversity');
    expect(getCard('axAdversity').weaponTypes).toEqual(['axe', 'katana', 'spear']);
  });
});

describe('黄金の錨・天使の羽衣をどこでも', () => {
  it('シナリオの限定が外れ、シナリオ1でも出る', () => {
    for (const id of ['goldenAnchor', 'angelRobe']) expect(getItem(id).scenario).toBeUndefined();
    const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'mage', gender: 'female' as const, name: '仲間1', playerId: 'P1' as PlayerId }] });
    const seen = new Set<string>();
    const rng = createRng(5);
    for (let i = 0; i < 400; i++) {
      seen.add(rollEquipment('legend', g.heroes, rng, { scenario: 'corruptionKing', slot: 'accessory' }).id);
      seen.add(rollEquipment('epic', g.heroes, rng, { scenario: 'corruptionKing', slot: 'armor' }).id);
    }
    expect(seen.has('goldenAnchor')).toBe(true);
    expect(seen.has('angelRobe')).toBe(true);
  });
});

describe('満ち潮の杯', () => {
  it('ターンの始めにHP+2。満タンであふれた分は、一番弱っているほかの味方へ流れる', () => {
    const s = battle(['warrior', 'hunter'], { accessory: 'tidalChalice' });
    s.allies[0].hp = s.allies[0].maxHp;
    s.allies[1].hp = s.allies[1].maxHp - 10;
    const r = endTurn(s);
    expect(r.state.allies[0].hp).toBe(r.state.allies[0].maxHp);
    expect(r.state.allies[1].hp).toBe(r.state.allies[1].maxHp - 8);
  });
  it('傷ついたほかの味方がいなければ、あふれた分は自分のブロックに', () => {
    const s = battle(['warrior'], { accessory: 'tidalChalice' });
    s.allies[0].hp = s.allies[0].maxHp;
    expect(endTurn(s).state.allies[0].block).toBe(2);
  });
  it('傷ついていれば、ふつうに自分が回復する（流さない）', () => {
    const s = battle(['warrior', 'hunter'], { accessory: 'tidalChalice' });
    s.allies[0].hp = s.allies[0].maxHp - 10;
    s.allies[1].hp = s.allies[1].maxHp - 10;
    const r = endTurn(s);
    expect(r.state.allies[0].hp).toBe(r.state.allies[0].maxHp - 8);
    expect(r.state.allies[1].hp).toBe(r.state.allies[1].maxHp - 10);
  });
  it('1ターンに2回まで（あふれた回復を何度起こしても、流れるのは2回）', () => {
    const s = battle(['warrior', 'hunter'], { accessory: 'tidalChalice' });
    s.allies[1].hp = 10;
    let st = s;
    // 応急処置（完全成功で9）を、HPが1だけ減った自分に4回: 毎回8があふれるが、流れるのは2回（8+8）
    for (let i = 0; i < 4; i++) { st.allies[0].hp = st.allies[0].maxHp - 1; st = use(st, 'cmFirstAid'); }
    expect(st.allies[1].hp).toBe(10 + 16);
  });
});

describe('回復役がいない時のスマート抽選（宿題7）', () => {
  const heroes = (...ids: string[]) => createGame({ seed: 1, scenarioId: 'corruptionKing', difficulty: 'normal', party: ids.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i}`, playerId: 'P1' as PlayerId })) }).heroes;
  it('僧侶がいれば回復役あり、剣士と狩人だけなら無し', () => {
    expect(partyHasHealer(heroes('warrior', 'priest'))).toBe(true);
    expect(partyHasHealer(heroes('warrior', 'hunter'))).toBe(false);
  });
  it('回復役がいない時だけ、共通の回復のカードの重みが2倍（ほかは変えない）', () => {
    expect(healerlessWeight(getCard('cmFirstAid'), true)).toBe(2);
    expect(healerlessWeight(getCard('cmFirstAid'), false)).toBe(1);
    const nonHeal = CARDS.all.find((c) => c.common && !cardTags(c).includes('heal'))!;
    expect(healerlessWeight(nonHeal, true)).toBe(1);
  });
  it('回復役がいない組では、共通の回復のカードが選ばれやすくなる', () => {
    const party = heroes('warrior', 'hunter');
    const cands = ['cmFirstAid', ...CARDS.all.filter((c) => c.common && !c.heresy && !c.teamOnly && !cardTags(c).includes('heal')).slice(0, 5).map((c) => c.id)];
    const count = (p?: Hero[]) => { const rng = createRng(9); let n = 0; for (let i = 0; i < 3000; i++) if (pickCard(cands, party[0], rng, true, 1, p) === 'cmFirstAid') n++; return n; };
    expect(count(party)).toBeGreaterThan(count(undefined) * 1.4);
  });
});

describe('説明の文（カードの詳細・装備の詳細に出る物）', () => {
  it('新しい札・装飾品の説明に、抜け（undefined など）が無い', async () => {
    const { describeEffect } = await import('../battle/effects');
    const { describeAbility } = await import('../abilities');
    for (const id of ['axManaWard', 'axWardBolt']) {
      const c = getCard(id);
      const text = c.tiers.flatMap((t) => t.effects.map((e) => describeEffect(e, 'ally', c))).join(' / ') + (c.trait ? describeAbility(c.trait) : '');
      expect(text, id).not.toMatch(/undefined|NaN|\[object/);
      expect(text.length, id).toBeGreaterThan(10);
    }
    const item = getItem('tidalChalice');
    for (const e of [item.ability!.effect, ...(item.ability!.also ?? [])]) expect(describeAbility({ name: item.ability!.name, effect: e })).not.toMatch(/undefined|NaN|\[object/);
    expect(describeAbility({ name: 'x', effect: item.ability!.also![0] })).toContain('あふれた量');
  });
});
