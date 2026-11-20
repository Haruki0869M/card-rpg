// ラインナップの見直し フェーズ1後半・第1回（docs/tasks/lineup-plan.md）
// 10個の装備の新しい効果を、実際の戦闘の流れで確かめる。
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, getItem } from '../../data/items';
import type { BattleEvent, BattleState, GameCommand, GameState, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, cardCostOf, createBattle, createGame, createRng, damageModifiers, describeAbility, startBattleWith, toPartyMember, unusableReason } from '../index';
import { giveHand } from './helpers';

ENEMIES.register({ id: 'phase1bIdler', name: '確認用の置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });

type Gear = { weapon?: string; armor?: string; accessory?: string };

function battle(classes: string[], gear: Gear[], opts: { enemies?: number; seed?: number; boss?: boolean; gold?: number } = {}): BattleState {
  const seed = opts.seed ?? 11;
  const g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: `P${i + 1}` as PlayerId })) });
  g.heroes.forEach((h, i) => {
    const x = gear[i] ?? {};
    if (x.weapon) h.equipment.weapon = { uid: `x${i}w`, itemId: x.weapon };
    if (x.armor) h.equipment.armor = { uid: `x${i}a`, itemId: x.armor };
    if (x.accessory) h.equipment.accessory = { uid: `x${i}c`, itemId: x.accessory };
    h.gold = opts.gold ?? 0;
  });
  return createBattle({ seed, party: g.heroes.map(toPartyMember), encounter: { id: 'phase1b', name: '確認', enemies: Array.from({ length: opts.enemies ?? 1 }, () => ({ defId: 'phase1bIdler' })), ...(opts.boss ? { boss: true } : {}) } });
}

/** 1人目がカードを1枚、完全成功で使う（手札はそのカード1枚に差し替える。マナは mana にそろえる） */
function use(s: BattleState, cardId: string, mana = 10, targetIndex = 0) {
  const a = s.allies[0];
  const card = getCard(cardId);
  giveHand(s, a.id, [cardId]);
  a.mana = mana;
  a.focus = 6;
  const r = applyCommand(s, { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: 't0', focusUsed: card.slots,
    targetId: card.target === 'enemy' ? s.enemies[targetIndex].uid : card.target === 'ally' ? a.id : undefined });
  expect(r.error, `${cardId}: ${r.error}`).toBeUndefined();
  return { state: r.state, events: r.events };
}

function endTurn(s: BattleState) {
  let r = { state: s, events: [] as BattleEvent[], error: undefined as string | undefined };
  for (const p of [...new Set(s.allies.map((a) => a.playerId))]) {
    if (r.state.phase !== 'ally') break;
    r = applyCommand(r.state, { type: 'END_TURN', playerId: p }) as typeof r;
  }
  let guard = 0;
  while (r.state.phase === 'enemy' && guard++ < 20) r = applyCommand(r.state, { type: 'ENEMY_STEP' }) as typeof r;
  expect(r.state.phase).toBe('ally');
  return r.state;
}

const fired = (events: BattleEvent[], name: string) => events.filter((e) => e.type === 'ability' && e.name === name).length;
const st = (u: { statuses: Record<string, number | undefined> }, id: string) => u.statuses[id] ?? 0;
const clone = (s: BattleState) => structuredClone(s);
/** 装備の能力が掛ける倍率（能力を外した時との比） */
function ratio(s: BattleState, cardId: string, name: string, prepare?: (c: BattleState) => void) {
  const c = clone(s);
  prepare?.(c);
  const on = damageModifiers(c, c.allies[0], getCard(cardId), c.enemies[0], undefined, true).multiplier;
  c.allies[0].abilities = (c.allies[0].abilities ?? []).filter((a) => a.name !== name);
  return on / damageModifiers(c, c.allies[0], getCard(cardId), c.enemies[0], undefined, true).multiplier;
}

describe('8個の装備のデータ', () => {
  const rows: [id: string, ability: string, slot: string, rarity: string][] = [
    ['everIceBracer', '絶対零度', 'accessory', 'legend'], ['kingSignet', '黄金律', 'accessory', 'legend'], ['sixWorldsBadge', '万華鏡', 'accessory', 'legend'],
    ['echoArmor', 'やまびこ', 'armor', 'epic'], ['sageScepter', '時の短縮', 'weapon', 'legend'], ['mummyWrappings', '千年の呪い', 'armor', 'legend'],
    ['paralysisShelterPendant', '感電回路', 'accessory', 'epic'],
    ['weakShelterPendant', '追い打ち', 'accessory', 'epic'],
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
    expect(getItem('everIceBracer').stats).toEqual({ int: 8 });
    expect(getItem('kingSignet').stats).toEqual({ luk: 10, dex: 6 });
    expect(getItem('kingSignet').goldBonus).toBe(0.25);
    expect(getItem('sixWorldsBadge').stats).toEqual({ str: 4, vit: 4, int: 4, dex: 4, agi: 4, per: 4, luk: 4 });
  });
  it('新しい部品の説明文', () => {
    expect(describeAbility(getItem('sageScepter').ability!)).toBe('1ターンに1枚、コスト3以上のカードのコスト-1');
    expect(describeAbility({ name: 'x', effect: getItem('sageScepter').ability!.effect })).toContain('カードのコスト-1（1ターンに1枚）');
    expect(describeAbility({ name: 'x', effect: getItem('echoArmor').ability!.effect })).toContain('カードのコストが0になる');
    expect(describeAbility({ name: 'x', effect: getItem('kingSignet').ability!.effect })).toContain('所持金50Gごとに与えるダメージ+5%（最大+35%）');
    expect(describeAbility({ name: 'x', effect: getItem('everIceBracer').ability!.also![0] })).toContain('「凍結」1（ボスには代わりに「弱体」1）');
    expect(describeAbility({ name: 'x', effect: getItem('paralysisShelterPendant').ability!.effect })).toContain('他の敵全員に');
  });
});

describe('溶けぬ氷の腕輪《絶対零度》', () => {
  const gear = [{ accessory: 'everIceBracer' }];
  it('戦闘の始めに、敵1体だけが凍る', () => {
    const s = battle(['mage'], gear, { enemies: 3 });
    expect(s.enemies.map((e) => st(e, 'freeze')).sort()).toEqual([0, 0, 1]);
    expect(s.enemies.every((e) => st(e, 'weak') === 0)).toBe(true);
  });
  it('ボスの戦闘では、凍結の代わりに「弱体」1', () => {
    const s = battle(['mage'], gear, { enemies: 3, boss: true });
    expect(s.boss).toBe(true);
    expect(s.enemies.every((e) => st(e, 'freeze') === 0)).toBe(true);
    expect(s.enemies.map((e) => st(e, 'weak')).sort()).toEqual([0, 0, 1]);
  });
  it('「凍結」か「弱体」の敵にだけ1.35倍', () => {
    const s = battle(['mage'], gear);
    const clear = (c: BattleState) => { c.enemies[0].statuses = {}; };
    expect(ratio(s, 'fireball', '絶対零度', clear)).toBe(1);
    expect(ratio(s, 'fireball', '絶対零度', (c) => { c.enemies[0].statuses = { freeze: 1 }; })).toBeCloseTo(1.35, 6);
    expect(ratio(s, 'strike', '絶対零度', (c) => { c.enemies[0].statuses = { weak: 2 }; })).toBeCloseTo(1.35, 6);
    expect(ratio(s, 'fireball', '絶対零度', (c) => { c.enemies[0].statuses = { poison: 3 }; })).toBe(1);
    // 実際のダメージも増える
    const hit = (prep: (c: BattleState) => void) => { const c = clone(s); prep(c); const hp = c.enemies[0].hp; return hp - use(c, 'fireball').state.enemies[0].hp; };
    expect(hit((c) => { c.enemies[0].statuses = { weak: 2 }; })).toBeGreaterThan(hit(clear));
  });
  it('ゲームの中では、ボスの部屋の戦闘だけにボスの印が付く', () => {
    const g = createGame({ seed: 5, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'mage', gender: 'female', name: 'A', playerId: 'P1' }] });
    startBattleWith(g, [{ defId: 'phase1bIdler' }], 'boss', createRng(1));
    expect(g.battle!.boss).toBe(true);
    startBattleWith(g, [{ defId: 'phase1bIdler' }], 'battle', createRng(1));
    expect(g.battle!.boss).toBeUndefined();
    startBattleWith(g, [{ defId: 'phase1bIdler' }], 'elite', createRng(1));
    expect(g.battle!.boss).toBeUndefined();
  });
});

describe('王の印章指輪《黄金律》', () => {
  const s = (gold: number) => battle(['warrior'], [{ accessory: 'kingSignet' }], { gold });
  it('所持金50Gごとに+5%、+35%で頭打ち', () => {
    expect(ratio(s(0), 'strike', '黄金律')).toBe(1);
    expect(ratio(s(49), 'strike', '黄金律')).toBe(1);
    expect(ratio(s(50), 'strike', '黄金律')).toBeCloseTo(1.05, 6);
    expect(ratio(s(120), 'strike', '黄金律')).toBeCloseTo(1.1, 6);
    expect(ratio(s(350), 'strike', '黄金律')).toBeCloseTo(1.35, 6);
    expect(ratio(s(9999), 'strike', '黄金律')).toBeCloseTo(1.35, 6);
  });
  it('見るのは戦闘の始めの所持金（保存にも入る）', () => {
    const b = s(120);
    expect(b.allies[0].gold).toBe(120);
    expect(JSON.parse(JSON.stringify(b)).allies[0].gold).toBe(120);
    expect(s(0).allies[0].gold).toBeUndefined();
  });
  it('勝った時のゴールドが25%増える（2人が持っていても重ならない）', () => {
    const P: PlayerId = 'P1';
    const run = (g: GameState, cmd: GameCommand) => { const r = applyGameCommand(g, cmd); if (r.error) throw new Error(`${cmd.type}: ${r.error}`); return r.state; };
    const gained = (rings: number) => {
      let g = createGame({ seed: 5, scenarioId: 'corruptionKing', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: P })) });
      g.mode = 'hub';
      g.world = undefined;
      g.heroes.forEach((h, i) => { if (i < rings) h.equipment.accessory = { uid: `k${i}`, itemId: 'kingSignet' }; });
      g = run(g, { type: 'ENTER_DUNGEON', playerId: P, dungeonId: 'emeraldTemple' });
      g = run(g, { type: 'ENTER_ROOM', playerId: P, roomId: 'r0c0' });
      const before = g.heroes.reduce((n, h) => n + h.gold, 0);
      g.battle!.bonusGold = 400;
      g.battle!.enemies.forEach((e) => (e.dead = true));
      g.battle!.phase = 'victory';
      g = run(g, { type: 'FINISH_BATTLE', playerId: P });
      return g.heroes.reduce((n, h) => n + h.gold, 0) - before;
    };
    const base = gained(0);
    expect(base).toBeGreaterThan(400);
    expect(gained(1)).toBe(Math.round(base * 1.25));
    expect(gained(2)).toBe(Math.round(base * 1.25));
  });
});

describe('六つの世界の徽章《万華鏡》', () => {
  it('同じターンに物理・魔法・スキルを全部使うと、マナ+2・2枚ドロー（1ターンに1回）', () => {
    let s = battle(['mage'], [{ accessory: 'sixWorldsBadge' }]);
    let r = use(s, 'strike');
    expect(fired(r.events, '万華鏡')).toBe(0);
    r = use(r.state, 'fireball');
    expect(fired(r.events, '万華鏡')).toBe(0);
    // 徽章が無い時と比べて、マナが2多く、手札が2枚多い
    const plain = clone(r.state);
    plain.allies[0].abilities = (plain.allies[0].abilities ?? []).filter((a) => a.name !== '万華鏡');
    const off = use(plain, 'battleCry').state.allies[0];
    r = use(r.state, 'battleCry');
    expect(fired(r.events, '万華鏡')).toBe(1);
    expect(r.state.allies[0].mana).toBe(off.mana + 2);
    expect(r.state.allies[0].hand.length).toBe(off.hand.length + 2);
    r = use(r.state, 'strike');
    expect(fired(r.events, '万華鏡')).toBe(0);
    // 次のターンは、また3種類そろえないと起きない
    s = endTurn(r.state);
    r = use(s, 'battleCry');
    expect(fired(r.events, '万華鏡')).toBe(0);
    r = use(r.state, 'iceLance');
    expect(fired(r.events, '万華鏡')).toBe(0);
    r = use(r.state, 'strike');
    expect(fired(r.events, '万華鏡')).toBe(1);
  });
});

describe('残響の鎧《やまびこ》', () => {
  it('戦闘の1ターン目、最初の1枚だけコスト0', () => {
    const s = battle(['mage'], [{ armor: 'echoArmor' }]);
    const a = s.allies[0];
    expect(cardCostOf(s, a, getCard('fireball')).cost).toBe(0);
    expect(cardCostOf(s, a, getCard('lnMaArcana')).cost).toBe(0);
    // マナが0でも使える
    a.mana = 0;
    expect(unusableReason(s, a, getCard('fireball'))).toBeNull();
    let r = use(s, 'fireball', 10);
    expect(r.state.allies[0].mana).toBe(10);
    expect(fired(r.events, 'やまびこ')).toBe(1);
    // 2枚目からは元のコスト
    expect(cardCostOf(r.state, r.state.allies[0], getCard('fireball')).cost).toBe(2);
    r = use(r.state, 'fireball', 10);
    expect(r.state.allies[0].mana).toBe(8);
    expect(fired(r.events, 'やまびこ')).toBe(0);
  });
  it('2ターン目からは何も起きない', () => {
    const s = endTurn(battle(['mage'], [{ armor: 'echoArmor' }]));
    expect(cardCostOf(s, s.allies[0], getCard('fireball')).cost).toBe(2);
    expect(use(s, 'fireball', 10).state.allies[0].mana).toBe(8);
  });
});

describe('賢者の錫杖《時の短縮》', () => {
  const start = () => battle(['priest'], [{ weapon: 'sageScepter' }]);
  it('コスト3以上のカードが、1ターンに1枚だけ1下がる', () => {
    const s = start();
    expect(cardCostOf(s, s.allies[0], getCard('lnSeiDivinePunish')).cost).toBe(2);
    expect(cardCostOf(s, s.allies[0], getCard('fireball')).cost).toBe(2);
    expect(cardCostOf(s, s.allies[0], getCard('strike')).cost).toBe(1);
    // コスト2のカードを使っても、権利は残る
    let r = use(s, 'fireball', 10);
    expect(r.state.allies[0].mana).toBe(8);
    r = use(r.state, 'lnSeiDivinePunish', 10);
    expect(r.state.allies[0].mana).toBe(8);
    expect(fired(r.events, '時の短縮')).toBe(1);
    // 同じターンの2枚目は元のコスト
    expect(cardCostOf(r.state, r.state.allies[0], getCard('lnSeiDivinePunish')).cost).toBe(3);
    r = use(r.state, 'lnSeiDivinePunish', 10);
    expect(r.state.allies[0].mana).toBe(7);
    // 次のターンは、また1枚下がる
    const next = endTurn(r.state);
    expect(use(next, 'lnSeiDivinePunish', 10).state.allies[0].mana).toBe(8);
  });
  it('マナ2で、コスト3のカードが使える', () => {
    const s = start();
    s.allies[0].mana = 2;
    expect(unusableReason(s, s.allies[0], getCard('lnSeiDivinePunish'))).toBeNull();
    s.allies[0].mana = 1;
    expect(unusableReason(s, s.allies[0], getCard('lnSeiDivinePunish'))).toBe('マナが足りません');
  });
  it('保存して再開しても、使った事を覚えている', () => {
    const r = use(start(), 'lnSeiDivinePunish', 10);
    const loaded: BattleState = JSON.parse(JSON.stringify(r.state));
    expect(cardCostOf(loaded, loaded.allies[0], getCard('lnSeiDivinePunish')).cost).toBe(3);
  });
  it('味方全員のブロックは、もう付かない', () => {
    const s = endTurn(battle(['priest', 'warrior'], [{ weapon: 'sageScepter' }]));
    expect(s.allies[1].block).toBe(0);
  });
});

describe('千年の包帯《千年の呪い》', () => {
  const s = () => battle(['warrior'], [{ armor: 'mummyWrappings' }]);
  it('自分が「毒」か「呪い」の間だけ1.25倍', () => {
    expect(ratio(s(), 'strike', '千年の呪い')).toBe(1);
    expect(ratio(s(), 'strike', '千年の呪い', (c) => { c.allies[0].statuses.poison = 2; })).toBeCloseTo(1.25, 6);
    expect(ratio(s(), 'strike', '千年の呪い', (c) => { c.allies[0].statuses.curse = 1; })).toBeCloseTo(1.25, 6);
    expect(ratio(s(), 'strike', '千年の呪い', (c) => { c.allies[0].statuses.poison = 2; c.allies[0].statuses.curse = 1; })).toBeCloseTo(1.25, 6);
    expect(ratio(s(), 'strike', '千年の呪い', (c) => { c.allies[0].statuses.weak = 2; })).toBe(1);
  });
  it('毎ターンのブロックは、もう付かない', () => {
    expect(endTurn(s()).allies[0].block).toBe(0);
  });
});

describe('感電の飾り（大飾りは区切りAで外した）', () => {
  const start = (id: string) => { const s = battle(['warrior'], [{ accessory: id }], { enemies: 3 }); s.enemies[0].statuses.paralysis = 5; return s; };
  const lost = (before: BattleState, after: BattleState) => after.enemies.map((e, i) => before.enemies[i].hp - e.hp);
  it('エピック: 「痺れ」の敵を攻撃すると、他の敵全員に雷4。1ターンに1回', () => {
    const s = start('paralysisShelterPendant');
    let r = use(clone(s), 'strike');
    expect(fired(r.events, '感電回路')).toBe(1);
    const d = lost(s, r.state);
    expect(d[0]).toBeGreaterThan(0);
    // 基本は4（能力値のぶん少し増える）。狙った敵には当たらない
    expect(d[1]).toBeGreaterThanOrEqual(4);
    expect(d[1]).toBeLessThanOrEqual(6);
    expect(d[2]).toBe(d[1]);
    const plain = clone(s);
    plain.allies[0].abilities = (plain.allies[0].abilities ?? []).filter((a) => a.name !== '感電回路');
    expect(lost(s, use(plain, 'strike').state)).toEqual([d[0], 0, 0]);
    const mid = r.state;
    r = use(clone(mid), 'strike');
    expect(fired(r.events, '感電回路')).toBe(0);
    expect(lost(mid, r.state).slice(1)).toEqual([0, 0]);
    // 次のターンは、また起きる
    r = use(endTurn(r.state), 'strike');
    expect(fired(r.events, '感電回路')).toBe(1);
  });
  it('「痺れ」でない敵を攻撃しても起きない（そのぶんの回数も減らない）', () => {
    const s = start('paralysisShelterPendant');
    let r = use(clone(s), 'strike', 10, 1);
    expect(fired(r.events, '感電回路')).toBe(0);
    r = use(r.state, 'strike', 10, 0);
    expect(fired(r.events, '感電回路')).toBe(1);
  });
});

describe('追い打ちの飾り（大飾りは区切りAで外した）', () => {
  const start = (id: string, enemies = 2) => { const s = battle(['warrior'], [{ accessory: id }], { enemies }); s.enemies[0].statuses.weak = 5; return s; };
  it('エピック: 「弱体」の敵を攻撃するとブロック3。1ターンに2回まで', () => {
    const s = start('weakShelterPendant');
    const b0 = s.allies[0].block;
    let r = use(clone(s), 'strike');
    expect(r.state.allies[0].block).toBe(b0 + 3);
    r = use(r.state, 'strike');
    expect(r.state.allies[0].block).toBe(b0 + 6);
    r = use(r.state, 'strike');
    expect(r.state.allies[0].block).toBe(b0 + 6);
    expect(fired(r.events, '追い打ち')).toBe(0);
    // 「弱体」でない敵では起きない
    const other = use(clone(s), 'strike', 10, 1);
    expect(other.state.allies[0].block).toBe(b0);
    // エピックは、倒しても弱体はうつらない
    const k = clone(s);
    k.enemies[0].hp = 1;
    expect(st(use(k, 'strike').state.enemies[1], 'weak')).toBe(0);
  });
});
