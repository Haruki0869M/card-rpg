// ラインナップの見直し フェーズ1後半・第2回（docs/tasks/lineup-plan.md）
// 残りの9個の装備の新しい効果を、実際の戦闘の流れで確かめる。
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, getItem } from '../../data/items';
import type { BattleEvent, BattleState, PlayerId } from '../../types';
import { statusBonusOf } from '../abilities';
import { applyCommand, createBattle, createGame, describeAbility, toPartyMember } from '../index';
import { giveHand } from './helpers';

ENEMIES.register({ id: 'phase1b2Idler', name: '確認用の置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });
ENEMIES.register({ id: 'phase1b2Hitter', name: '確認用の殴る人形', icon: 'H', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'hit', name: '殴る', effects: [{ kind: 'damage', amount: 6 }] }] });

type Gear = { weapon?: string; armor?: string; accessory?: string };

function battle(gear: Gear, opts: { enemies?: number; enemy?: string; seed?: number } = {}): BattleState {
  const seed = opts.seed ?? 11;
  const g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'female' as const, name: '仲間1', playerId: 'P1' as PlayerId }] });
  const h = g.heroes[0];
  if (gear.weapon) h.equipment.weapon = { uid: 'xw', itemId: gear.weapon };
  if (gear.armor) h.equipment.armor = { uid: 'xa', itemId: gear.armor };
  if (gear.accessory) h.equipment.accessory = { uid: 'xc', itemId: gear.accessory };
  return createBattle({ seed, party: g.heroes.map(toPartyMember), encounter: { id: 'phase1b2', name: '確認', enemies: Array.from({ length: opts.enemies ?? 1 }, () => ({ defId: opts.enemy ?? 'phase1b2Idler' })) } });
}

/** カードを1枚、完全成功で使う */
function use(s: BattleState, cardId: string, targetIndex = 0) {
  const a = s.allies[0];
  const card = getCard(cardId);
  giveHand(s, a.id, [cardId]);
  a.mana = 10;
  a.focus = 6;
  const r = applyCommand(s, { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: 't0', focusUsed: card.slots,
    targetId: card.target === 'enemy' ? s.enemies[targetIndex].uid : card.target === 'ally' ? a.id : undefined });
  expect(r.error, `${cardId}: ${r.error}`).toBeUndefined();
  return { state: r.state, events: r.events };
}

/** ターンを終えて、敵の番を最後まで進める（起きた出来事も返す） */
function endTurn(s: BattleState) {
  const events: BattleEvent[] = [];
  let r = applyCommand(s, { type: 'END_TURN', playerId: s.allies[0].playerId });
  events.push(...r.events);
  let guard = 0;
  while (r.state.phase === 'enemy' && guard++ < 20) { r = applyCommand(r.state, { type: 'ENEMY_STEP' }); events.push(...r.events); }
  expect(r.state.phase).toBe('ally');
  return { state: r.state, events };
}

const fired = (events: BattleEvent[], name: string) => events.filter((e) => e.type === 'ability' && e.name === name).length;
const st = (u: { statuses: Record<string, number | undefined> }, id: string) => u.statuses[id] ?? 0;
/** 同じ場面で、その能力だけを外した物 */
function without(s: BattleState, name: string) {
  const c = structuredClone(s);
  c.allies[0].abilities = (c.allies[0].abilities ?? []).filter((a) => a.name !== name);
  return c;
}
const lost = (s: BattleState, i = 0) => s.enemies[i].maxHp - s.enemies[i].hp;

describe('9個の装備のデータ', () => {
  const rows: [id: string, ability: string, slot: string, rarity: string][] = [
    ['masterCore', '永久機関', 'accessory', 'legend'], ['goldenAnchor', '不動の錨', 'accessory', 'legend'],
    ['steelPlate', '蒸気反撃', 'armor', 'epic'], ['barnacleArmor', '棘の殻', 'armor', 'epic'], ['angelRobe', '福音', 'armor', 'epic'],
    ['burnShelterPendant', '紅蓮の連鎖', 'accessory', 'epic'], ['burnRecoveryPendant', '紅蓮の大連鎖', 'accessory', 'legend'],
    ['poisonShelterPendant', '猛毒の触媒', 'accessory', 'epic'], ['poisonRecoveryPendant', '猛毒の大触媒', 'accessory', 'legend'],
  ];
  for (const [id, name, slot, rarity] of rows) {
    it(`${id}《${name}》: 名前が重ならず、説明が読め、場所とレア度は元のまま`, () => {
      const item = getItem(id);
      expect(item.ability!.name).toBe(name);
      expect(ITEMS.all.filter((i) => i.ability?.name === name).map((i) => i.id)).toEqual([id]);
      expect(ITEMS.all.filter((i) => i.name === item.name).map((i) => i.id)).toEqual([id]);
      for (const effect of [item.ability!.effect, ...(item.ability!.also ?? [])]) {
        const text = describeAbility({ name, effect });
        expect(text.length).toBeGreaterThan(5);
        expect(text).not.toContain('undefined');
      }
      expect(item.slot).toBe(slot);
      expect(item.rarity).toBe(rarity);
      expect(item.description.length).toBeGreaterThan(10);
    });
  }
  it('能力値は計画どおり', () => {
    expect(getItem('masterCore').stats).toEqual({ int: 6, dex: 6 });
    expect(getItem('goldenAnchor').stats).toEqual({ vit: 10 });
    for (const id of ['steelPlate', 'barnacleArmor', 'angelRobe']) expect(getItem(id).maxHp).toBe(12);
  });
});

describe('マスターコア《永久機関》', () => {
  it('召喚が、ターンの終わりに2回攻撃する（残りターンは1回分だけ減る）', () => {
    const s = use(battle({ accessory: 'masterCore' }), 'summonSprite').state;
    const on = endTurn(structuredClone(s));
    const off = endTurn(without(s, '永久機関'));
    expect(lost(off.state)).toBeGreaterThan(0);
    expect(lost(on.state)).toBeGreaterThan(lost(off.state));
    expect(lost(on.state)).toBeLessThanOrEqual(lost(off.state) * 2 + 2);
    expect(fired(on.events, '永久機関')).toBe(1);
    expect(fired(off.events, '永久機関')).toBe(0);
    expect(on.state.allies[0].summons!.map((x) => x.turns)).toEqual(off.state.allies[0].summons!.map((x) => x.turns));
  });
  it('砲台も2回攻撃する', () => {
    const s = use(battle({ accessory: 'masterCore' }), 'placeTurret').state;
    const on = endTurn(structuredClone(s));
    const off = endTurn(without(s, '永久機関'));
    expect(lost(on.state)).toBeGreaterThan(lost(off.state));
    expect(fired(on.events, '永久機関')).toBe(1);
  });
  it('罠も2回発動する', () => {
    const s = use(battle({ accessory: 'masterCore' }), 'placeTrap').state;
    const on = endTurn(structuredClone(s));
    const off = endTurn(without(s, '永久機関'));
    expect(lost(off.state)).toBeGreaterThan(0);
    expect(lost(on.state)).toBeGreaterThan(lost(off.state));
    expect(fired(on.events, '永久機関')).toBe(1);
  });
  it('召喚が無ければ何も起きない', () => {
    expect(fired(endTurn(battle({ accessory: 'masterCore' })).events, '永久機関')).toBe(0);
  });
});

describe('黄金の錨《不動の錨》', () => {
  const next = (gear: Gear, block: number) => { const s = battle(gear); s.allies[0].block = block; return endTurn(s).state.allies[0].block; };
  it('前のターンのブロックが、最大15まで残る', () => {
    expect(next({ accessory: 'goldenAnchor' }, 40)).toBe(15);
    expect(next({ accessory: 'goldenAnchor' }, 9)).toBe(9);
    expect(next({ accessory: 'goldenAnchor' }, 0)).toBe(0);
  });
  it('持っていなければ、今までどおり0に戻る', () => {
    expect(next({}, 40)).toBe(0);
  });
});

describe('鋼鉄の胸当て《蒸気反撃》', () => {
  it('攻撃をブロックで完全に防ぐと、敵全員に火のダメージ', () => {
    const s = battle({ armor: 'steelPlate' }, { enemies: 2, enemy: 'phase1b2Hitter' });
    s.allies[0].block = 60;
    const hp = s.allies[0].hp;
    const r = endTurn(s);
    expect(r.state.allies[0].hp).toBe(hp);
    expect(fired(r.events, '蒸気反撃')).toBe(2); // 2体が1回ずつ殴る
    for (const i of [0, 1]) expect(lost(r.state, i)).toBeGreaterThanOrEqual(6);
  });
  it('少しでもHPが減ったら起きない', () => {
    const s = battle({ armor: 'steelPlate' }, { enemy: 'phase1b2Hitter' });
    s.allies[0].block = 1;
    const r = endTurn(s);
    expect(fired(r.events, '蒸気反撃')).toBe(0);
    expect(lost(r.state)).toBe(0);
  });
  it('ダメージを受けた時のブロックは、もう付かない', () => {
    const s = battle({ armor: 'steelPlate' }, { enemy: 'phase1b2Hitter' });
    expect(fired(endTurn(s).events, '鋼の守り')).toBe(0);
  });
});

describe('フジツボの鎧《棘の殻》', () => {
  it('ダメージを受けると、殴ってきた敵だけに「毒」と反撃', () => {
    const s = battle({ armor: 'barnacleArmor' }, { enemies: 2, enemy: 'phase1b2Hitter' });
    const one = applyCommand(applyCommand(s, { type: 'END_TURN', playerId: 'P1' as PlayerId }).state, { type: 'ENEMY_STEP' });
    // 1体目が殴った所: 1体目だけ毒2と4以上のダメージ
    const [a, b] = one.state.enemies;
    if (one.state.phase === 'enemy') {
      expect(st(a, 'poison')).toBe(2);
      expect(st(b, 'poison')).toBe(0);
      expect(b.maxHp - b.hp).toBe(0);
    }
    expect(a.maxHp - a.hp).toBeGreaterThanOrEqual(4);
    const r = endTurn(s);
    expect(fired(r.events, '棘の殻')).toBeGreaterThanOrEqual(2);
    for (const i of [0, 1]) expect(lost(r.state, i)).toBeGreaterThanOrEqual(4);
  });
  it('完全に防いだ時は起きない', () => {
    const s = battle({ armor: 'barnacleArmor' }, { enemy: 'phase1b2Hitter' });
    s.allies[0].block = 60;
    const r = endTurn(s);
    expect(fired(r.events, '棘の殻')).toBe(0);
    expect(lost(r.state)).toBe(0);
  });
});

describe('天使の羽衣《福音》', () => {
  it('回復した量の半分のブロックを得る', () => {
    const s = battle({ armor: 'angelRobe' });
    s.allies[0].hp -= 30;
    const hp = s.allies[0].hp;
    const r = use(s, 'mend');
    const healed = r.state.allies[0].hp - hp;
    expect(healed).toBeGreaterThan(1);
    expect(r.state.allies[0].block).toBe(Math.floor(healed / 2));
    expect(fired(r.events, '福音')).toBe(1);
  });
  it('HPが満タンで回復しなかった時は、ブロックも無い', () => {
    const s = battle({ armor: 'angelRobe' });
    s.allies[0].hp = s.allies[0].maxHp;
    const r = use(s, 'mend');
    expect(r.state.allies[0].block).toBe(0);
    expect(fired(r.events, '福音')).toBe(0);
  });
  it('持っていなければ、回復してもブロックは付かない', () => {
    const s = battle({});
    s.allies[0].hp -= 30;
    expect(use(s, 'mend').state.allies[0].block).toBe(0);
  });
});

describe('紅蓮の飾り・紅蓮の大飾り', () => {
  it('エピック: 敵に「火傷」を与えるとブロック2', () => {
    const r = use(battle({ accessory: 'burnShelterPendant' }), 'fireball');
    const n = fired(r.events, '紅蓮の連鎖');
    expect(n).toBeGreaterThanOrEqual(1);
    expect(r.state.allies[0].block).toBe(2 * n);
    expect(st(r.state.enemies[0], 'burn')).toBeGreaterThanOrEqual(2);
  });
  it('「火傷」でない状態異常では起きない', () => {
    const r = use(battle({ accessory: 'burnShelterPendant' }), 'poisonArrow');
    expect(fired(r.events, '紅蓮の連鎖')).toBe(0);
    expect(r.state.allies[0].block).toBe(0);
  });
  it('レジェンド: ブロックに加えて、火傷のダメージをすぐに与える。付ける「火傷」+1。火傷は減らない', () => {
    const s = battle({ accessory: 'burnRecoveryPendant' });
    const on = use(structuredClone(s), 'fireball');
    const off = use(without(s, '紅蓮の大連鎖'), 'fireball');
    const n = fired(on.events, '紅蓮の大連鎖');
    expect(n).toBeGreaterThanOrEqual(1);
    expect(on.state.allies[0].block).toBe(2 * n);
    expect(st(on.state.enemies[0], 'burn')).toBe(st(off.state.enemies[0], 'burn') + 1);
    expect(lost(on.state) - lost(off.state)).toBe(4 * n);
  });
});

describe('猛毒の飾り・猛毒の大飾り', () => {
  it('すでに「毒」の敵に付ける「毒」が+2。毒でない敵には増えない', () => {
    for (const id of ['poisonShelterPendant', 'poisonRecoveryPendant']) {
      const s = battle({ accessory: id });
      const [a, e] = [s.allies[0], s.enemies[0]];
      expect(statusBonusOf(a, 'poison', undefined, e)).toBe(0);
      e.statuses.poison = 1;
      expect(statusBonusOf(a, 'poison', undefined, e)).toBe(2);
      expect(statusBonusOf(a, 'burn', undefined, e)).toBe(0);
    }
  });
  it('カードで実際に増える', () => {
    const s = battle({ accessory: 'poisonShelterPendant' });
    s.enemies[0].statuses.poison = 1;
    const on = use(structuredClone(s), 'poisonArrow');
    const off = use(without(s, '猛毒の触媒'), 'poisonArrow');
    expect(st(on.state.enemies[0], 'poison')).toBe(st(off.state.enemies[0], 'poison') + 2);
  });
  it('レジェンド: 敵が毒でダメージを受けるたびに、HPを2回復', () => {
    const s = battle({ accessory: 'poisonRecoveryPendant' }, { enemies: 2 });
    s.allies[0].hp -= 20;
    const hp = s.allies[0].hp;
    s.enemies[0].statuses.poison = 5;
    s.enemies[1].statuses.poison = 3;
    const r = endTurn(s);
    expect(fired(r.events, '猛毒の大触媒')).toBe(2);
    expect(r.state.allies[0].hp).toBe(hp + 4);
  });
  it('毒以外の継続ダメージ（火傷）では回復しない', () => {
    const s = battle({ accessory: 'poisonRecoveryPendant' });
    s.allies[0].hp -= 20;
    const hp = s.allies[0].hp;
    s.enemies[0].statuses.burn = 3;
    const r = endTurn(s);
    expect(fired(r.events, '猛毒の大触媒')).toBe(0);
    expect(r.state.allies[0].hp).toBe(hp);
  });
});
