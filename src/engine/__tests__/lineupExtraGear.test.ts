// ラインナップの見直し 追加の装備（docs/tasks/lineup-extra-gear.md）
// エピック以上の11個の新しい効果と、レア以下の「中身が同じ」7組に付けた差を、実際の戦闘の流れで確かめる。
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, getItem } from '../../data/items';
import type { BattleEvent, BattleState, Command, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, createRng, describeAbility, slotPreviewLimitOf, toPartyMember } from '../index';
import { damageModifiers } from '../abilities';
import { giveHand } from './helpers';

ENEMIES.register({ id: 'extraGearIdler', name: '確認用の置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });
ENEMIES.register({ id: 'extraGearWeakFire', name: '確認用の火に弱い置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence', weak: ['fire'],
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });

type Gear = { weapon?: string; armor?: string; accessory?: string };

function battle(classes: string[], gear: Gear[], opts: { enemies?: number; enemy?: string; seed?: number } = {}): BattleState {
  const seed = opts.seed ?? 11;
  const g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: `P${i + 1}` as PlayerId })) });
  g.heroes.forEach((h, i) => {
    const x = gear[i] ?? {};
    if (x.weapon) h.equipment.weapon = { uid: `x${i}w`, itemId: x.weapon };
    if (x.armor) h.equipment.armor = { uid: `x${i}a`, itemId: x.armor };
    if (x.accessory) h.equipment.accessory = { uid: `x${i}c`, itemId: x.accessory };
  });
  return createBattle({ seed, party: g.heroes.map(toPartyMember), encounter: { id: 'extraGear', name: '確認', enemies: Array.from({ length: opts.enemies ?? 1 }, () => ({ defId: opts.enemy ?? 'extraGearIdler' })) } });
}

/** 最初の3回の判定が必ず外れる乱数の種 */
const MISS_SEED = (() => {
  for (let seed = 1; seed < 2000000; seed++) {
    const p = createRng(seed);
    if (p.next() >= 0.96 && p.next() >= 0.96 && p.next() >= 0.96) return seed;
  }
  throw new Error('外れる種が見つからない');
})();

/** index 番目の味方がカードを1枚使う（手札はそのカード1枚に差し替える。マナ10・フォーカス6にそろえる） */
function use(s: BattleState, index: number, cardId: string, mode: 'perfect' | 'miss' | number = 0) {
  const a = s.allies[index];
  const card = getCard(cardId);
  giveHand(s, a.id, [cardId]);
  a.mana = 10;
  a.focus = 6;
  if (mode === 'miss') s.rngState = MISS_SEED;
  const focusUsed = mode === 'perfect' ? card.slots : mode === 'miss' ? 0 : mode;
  const r = applyCommand(s, { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: 't0', focusUsed,
    targetId: card.target === 'enemy' ? s.enemies[0].uid : card.target === 'ally' ? a.id : undefined });
  expect(r.error, `${cardId}: ${r.error}`).toBeUndefined();
  const roll = r.events.find((e): e is Extract<BattleEvent, { type: 'roll' }> => e.type === 'roll')!;
  if (mode === 'perfect') expect(roll.perfect).toBe(true);
  if (mode === 'miss') expect(roll.successes).toBe(0);
  return { state: r.state, events: r.events, roll };
}

function endTurn(s: BattleState) {
  const events: BattleEvent[] = [];
  let r = { state: s, events: [] as BattleEvent[], error: undefined as string | undefined };
  // 全員の番を終える（ローカル協力ではプレイヤーごとに END_TURN が要る）
  for (const p of [...new Set(s.allies.map((a) => a.playerId))]) {
    if (r.state.phase !== 'ally') break;
    r = applyCommand(r.state, { type: 'END_TURN', playerId: p }) as typeof r;
    events.push(...r.events);
  }
  let guard = 0;
  while (r.state.phase === 'enemy' && guard++ < 20) {
    r = applyCommand(r.state, { type: 'ENEMY_STEP' }) as typeof r;
    events.push(...r.events);
  }
  expect(r.state.phase).toBe('ally');
  return { state: r.state, events };
}

const fired = (events: BattleEvent[], name: string) => events.filter((e) => e.type === 'ability' && e.name === name).length;
const st = (u: { statuses: Record<string, number | undefined> }, id: string) => u.statuses[id] ?? 0;
const clone = (s: BattleState) => structuredClone(s);
/** 完全成功で1枚使って、敵1体目のHPがいくつ減ったか */
function dmg(s: BattleState, cardId: string, prepare?: (c: BattleState) => void) {
  const c = clone(s);
  prepare?.(c);
  const before = c.enemies[0].hp;
  const r = use(c, 0, cardId, 'perfect');
  return { loss: before - r.state.enemies[0].hp, ...r };
}
const without = (name: string) => (c: BattleState) => { c.allies[0].abilities = (c.allies[0].abilities ?? []).filter((a) => a.name !== name); };
/** 装備の能力が掛ける倍率（能力を外した時との比）。ダメージは端数を切り捨てるので、倍率そのものを確かめる */
function ratio(s: BattleState, cardId: string, name: string, prepare?: (c: BattleState) => void, element?: string) {
  const c = clone(s);
  prepare?.(c);
  const on = damageModifiers(c, c.allies[0], getCard(cardId), c.enemies[0], undefined, true, element).multiplier;
  without(name)(c);
  return on / damageModifiers(c, c.allies[0], getCard(cardId), c.enemies[0], undefined, true, element).multiplier;
}

describe('11個の装備のデータ（能力の名前・説明・印）', () => {
  const rows: { id: string; name: string; text: string; tags: string[] }[] = [
    { id: 'pharaohStaff', name: '王の裁き', text: '魔法カード：弱点属性のダメージ×1.25', tags: ['magic'] },
    { id: 'constellationStaff', name: '星座を結ぶ', text: '魔法カード：対象の悪い状態異常1種類につき与えるダメージ+8%（最大+24%）', tags: ['magic'] },
    { id: 'tideStaff', name: '満ち潮', text: '', tags: [] },
    { id: 'memoryStaff', name: '追憶', text: 'コスト2以上の魔法カードが完全成功した時（1回の戦闘で1回まで）：使ったカードの効果をもう一度発動', tags: ['magic', 'highCost'] },
    { id: 'sunScepter', name: '日輪の祈り', text: '回復のカードを使った後（1ターンに1回）：自分に「聖光」1（最大5。次の聖属性の攻撃が1つにつき+15%。撃つと消える）', tags: ['holy', 'heal'] },
    { id: 'lighthouseScepter', name: '霧払いの灯', text: '回復のカードが完全成功した時（1ターンに1回）：ランダムな敵1体に「脆弱」1', tags: ['holy', 'heal', 'vulnerable'] },
    { id: 'starScepter', name: '星の導き手', text: '', tags: ['holy', 'focus'] },
    { id: 'gearGuardian', name: '歯車の番兵', text: '', tags: ['summon'] },
    { id: 'dawnMantle', name: '夜明けの加護', text: 'フォーカスを使ってカードを使った後（1ターンに1回）：ブロック5、カードを1枚引く', tags: ['focus', 'block', 'draw'] },
    { id: 'stardustArmor', name: '降る星屑', text: '2枠以上のカードが完全成功した時（1ターンに1回）：味方全員に「応援」1（次に使うカードの成功率+10%。最大3）', tags: ['focus'] },
    { id: 'sparkRing', name: '散る火花', text: 'コスト0のカードを使った後（1ターンに1回）：ランダムな敵1体に3の雷属性ダメージ、ランダムな敵1体に「火傷」1', tags: ['thunder', 'fire', 'free'] },
  ];
  for (const row of rows) {
    it(`${row.id}《${row.name}》: 名前がほかの装備と重ならず、説明が読める`, () => {
      const item = getItem(row.id);
      expect(item.ability!.name).toBe(row.name);
      expect(ITEMS.all.filter((i) => i.ability?.name === row.name).map((i) => i.id)).toEqual([row.id]);
      const text = describeAbility(item.ability!);
      expect(text.length).toBeGreaterThan(5);
      expect(text).not.toContain('undefined');
      if (row.text) expect(text).toBe(row.text);
      if (row.tags.length) expect(item.tags).toEqual(row.tags);
      expect(item.description.length).toBeGreaterThan(10);
    });
  }
  it('レア度・場所・シナリオは変えていない', () => {
    const keep: [string, string, string, string][] = [
      ['pharaohStaff', 'weapon', 'epic', 'sandDynasty'], ['constellationStaff', 'weapon', 'epic', 'starCastle'], ['tideStaff', 'weapon', 'epic', 'cursedArchipelago'], ['memoryStaff', 'weapon', 'epic', 'dreamLabyrinth'],
      ['sunScepter', 'weapon', 'epic', 'sandDynasty'], ['lighthouseScepter', 'weapon', 'epic', 'cursedArchipelago'], ['starScepter', 'weapon', 'epic', 'starCastle'],
      ['gearGuardian', 'armor', 'legend', 'clockworkEmpire'], ['dawnMantle', 'armor', 'legend', 'dreamLabyrinth'], ['stardustArmor', 'armor', 'legend', 'starCastle'], ['sparkRing', 'accessory', 'epic', 'clockworkEmpire'],
    ];
    for (const [id, slot, , scenario] of keep) {
      expect(getItem(id).slot, id).toBe(slot);
      expect(getItem(id).scenario, id).toBe(scenario);
      expect(['epic', 'legend'], id).toContain(getItem(id).rarity);
    }
  });
});

describe('王家の杖《王の裁き》', () => {
  it('魔法で弱点を突いた時だけ、ダメージが1.25倍', () => {
    const weak = battle(['mage'], [{ weapon: 'pharaohStaff' }], { enemy: 'extraGearWeakFire' });
    const on = dmg(weak, 'fireball').loss, off = dmg(weak, 'fireball', without('王の裁き')).loss;
    expect(off).toBeGreaterThan(20);
    expect(on).toBeGreaterThan(off);
    expect(ratio(weak, 'fireball', '王の裁き', undefined, 'fire')).toBeCloseTo(1.25, 6);
    expect(ratio(weak, 'iceLance', '王の裁き', undefined, 'ice')).toBe(1);
    expect(ratio(weak, 'strike', '王の裁き', undefined, 'fire')).toBe(1);
    // 弱点でない属性（氷）は増えない
    expect(dmg(weak, 'iceLance').loss).toBe(dmg(weak, 'iceLance', without('王の裁き')).loss);
  });
  it('弱点の無い敵には何も起きない', () => {
    const plain = battle(['mage'], [{ weapon: 'pharaohStaff' }]);
    expect(dmg(plain, 'fireball').loss).toBe(dmg(plain, 'fireball', without('王の裁き')).loss);
  });
  it('条件は「魔法カード」', () => {
    expect(getItem('pharaohStaff').ability!.effect).toEqual({ modifier: 'weaknessDamage', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'magic' }] });
  });
});

describe('星座の杖《星座を結ぶ》', () => {
  const s = () => battle(['mage'], [{ weapon: 'constellationStaff' }]);
  const withStatuses = (ids: string[]) => (c: BattleState) => { for (const id of ids) c.enemies[0].statuses[id] = 1; };
  it('悪い状態異常1種類につき+8%、3種類（+24%）で頭打ち', () => {
    const d0 = dmg(s(), 'fireball').loss;
    const d1 = dmg(s(), 'fireball', withStatuses(['weak'])).loss;
    const d3 = dmg(s(), 'fireball', withStatuses(['weak', 'poison', 'burn'])).loss;
    const d4 = dmg(s(), 'fireball', withStatuses(['weak', 'poison', 'burn', 'freeze'])).loss;
    expect(d0).toBeGreaterThan(20);
    expect(d1).toBeGreaterThan(d0);
    expect(ratio(s(), 'fireball', '星座を結ぶ')).toBe(1);
    expect(ratio(s(), 'fireball', '星座を結ぶ', withStatuses(['weak']))).toBeCloseTo(1.08, 6);
    expect(ratio(s(), 'fireball', '星座を結ぶ', withStatuses(['weak', 'poison']))).toBeCloseTo(1.16, 6);
    expect(ratio(s(), 'fireball', '星座を結ぶ', withStatuses(['weak', 'poison', 'burn']))).toBeCloseTo(1.24, 6);
    expect(ratio(s(), 'fireball', '星座を結ぶ', withStatuses(['weak', 'poison', 'burn', 'freeze', 'curse']))).toBeCloseTo(1.24, 6);
    expect(d3).toBeGreaterThan(d1);
    expect(d4).toBe(d3);
  });
  it('状態異常が無ければ増えない・物理カードでは増えない', () => {
    expect(dmg(s(), 'fireball').loss).toBe(dmg(s(), 'fireball', without('星座を結ぶ')).loss);
    const three = withStatuses(['weak', 'poison', 'burn']);
    expect(dmg(s(), 'strike', three).loss).toBe(dmg(s(), 'strike', (c) => { three(c); without('星座を結ぶ')(c); }).loss);
  });
});

describe('潮騒の杖《満ち潮》', () => {
  const s = () => battle(['mage'], [{ weapon: 'tideStaff' }]);
  it('ブロック8以上の間だけ、魔法のダメージが1.25倍', () => {
    const low = dmg(s(), 'fireball', (c) => { c.allies[0].block = 7; }).loss;
    const high = dmg(s(), 'fireball', (c) => { c.allies[0].block = 8; }).loss;
    expect(low).toBe(dmg(s(), 'fireball', (c) => { c.allies[0].block = 7; without('満ち潮')(c); }).loss);
    expect(ratio(s(), 'fireball', '満ち潮', (c) => { c.allies[0].block = 7; })).toBe(1);
    expect(ratio(s(), 'fireball', '満ち潮', (c) => { c.allies[0].block = 8; })).toBeCloseTo(1.25, 6);
    expect(high).toBeGreaterThan(low);
  });
  it('物理カードは増えない', () => {
    const b = (c: BattleState) => { c.allies[0].block = 20; };
    expect(dmg(s(), 'strike', b).loss).toBe(dmg(s(), 'strike', (c) => { b(c); without('満ち潮')(c); }).loss);
  });
});

describe('記憶の杖《追憶》', () => {
  const s = () => battle(['mage'], [{ weapon: 'memoryStaff' }]);
  it('コスト2以上の魔法が完全成功すると、もう一度起きる。1回の戦闘で1回だけ', () => {
    const base = s();
    const off = dmg(base, 'fireball', without('追憶'));
    const first = dmg(base, 'fireball');
    expect(fired(first.events, '追憶')).toBe(1);
    // 2回目の分も入る（カードに書いてある効果がもう一度）
    expect(first.loss).toBeGreaterThanOrEqual(off.loss + 20);
    const second = dmg(first.state, 'fireball');
    expect(fired(second.events, '追憶')).toBe(0);
    // 次のターンになっても、もう起きない
    const next = endTurn(second.state).state;
    expect(fired(dmg(next, 'fireball').events, '追憶')).toBe(0);
  });
  it('コスト1の魔法・完全成功でない時・物理カードでは起きず、回数も減らない', () => {
    let c = s();
    let r = use(c, 0, 'iceLance', 'perfect');
    expect(fired(r.events, '追憶')).toBe(0);
    r = use(r.state, 0, 'fireball', 'miss');
    expect(fired(r.events, '追憶')).toBe(0);
    r = use(r.state, 0, 'strike', 'perfect');
    expect(fired(r.events, '追憶')).toBe(0);
    c = r.state;
    expect(fired(use(c, 0, 'fireball', 'perfect').events, '追憶')).toBe(1);
  });
});

describe('太陽の錫杖《日輪の祈り》', () => {
  const s = () => battle(['mage'], [{ weapon: 'sunScepter' }]);
  it('回復のカードを使うと、自分に聖光1。1ターンに1回', () => {
    let r = use(s(), 0, 'mend');
    expect(fired(r.events, '日輪の祈り')).toBe(1);
    expect(st(r.state.allies[0], 'holyLight')).toBe(1);
    r = use(r.state, 0, 'mend');
    expect(fired(r.events, '日輪の祈り')).toBe(0);
    expect(st(r.state.allies[0], 'holyLight')).toBe(1);
    const next = endTurn(r.state).state;
    r = use(next, 0, 'mend');
    expect(st(r.state.allies[0], 'holyLight')).toBe(2);
  });
  it('回復でないカードではたまらない・5より多くはたまらない', () => {
    const r = use(s(), 0, 'strike', 'perfect');
    expect(st(r.state.allies[0], 'holyLight')).toBe(0);
    const full = s();
    full.allies[0].statuses.holyLight = 5;
    expect(st(use(full, 0, 'mend').state.allies[0], 'holyLight')).toBe(5);
  });
});

describe('灯台守の錫杖《霧払いの灯》', () => {
  const s = () => battle(['mage'], [{ weapon: 'lighthouseScepter' }]);
  it('回復のカードが完全成功すると、敵に脆弱1。1ターンに1回', () => {
    let r = use(s(), 0, 'mend', 'perfect');
    expect(fired(r.events, '霧払いの灯')).toBe(1);
    expect(st(r.state.enemies[0], 'vulnerable')).toBe(1);
    r = use(r.state, 0, 'mend', 'perfect');
    expect(fired(r.events, '霧払いの灯')).toBe(0);
    expect(st(r.state.enemies[0], 'vulnerable')).toBe(1);
  });
  it('完全成功でなければ起きない・攻撃のカードでは起きない', () => {
    let r = use(s(), 0, 'mend', 'miss');
    expect(st(r.state.enemies[0], 'vulnerable')).toBe(0);
    r = use(r.state, 0, 'strike', 'perfect');
    expect(st(r.state.enemies[0], 'vulnerable')).toBe(0);
    expect(fired(use(r.state, 0, 'mend', 'perfect').events, '霧払いの灯')).toBe(1);
  });
});

describe('星環の錫杖《星の導き手》', () => {
  const s = () => battle(['mage'], [{ weapon: 'starScepter' }]);
  const preview = (c: BattleState, focusUsed = 0): Command => {
    const a = c.allies[0];
    giveHand(c, a.id, ['iceLance']);
    a.mana = 10;
    a.focus = 6;
    return { type: 'PREVIEW_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: 't0', targetId: c.enemies[0].uid, focusUsed };
  };
  const confirm = (c: BattleState): Command => ({ type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: c.allies[0].id });
  const reroll = (c: BattleState): Command => ({ type: 'REROLL_PREVIEW', playerId: 'P1', characterId: c.allies[0].id });

  it('1回の戦闘で2回まで先に見られる。3回目は断られる', () => {
    let c = s();
    expect(slotPreviewLimitOf(c.allies[0])).toBe(2);
    expect(slotPreviewLimitOf(battle(['mage'], [{}]).allies[0])).toBe(0);
    for (let n = 0; n < 2; n++) {
      const p = applyCommand(c, preview(c));
      expect(p.error, `${n + 1}回目`).toBeUndefined();
      expect(p.state.slotPreview).toBeDefined();
      const d = applyCommand(p.state, confirm(p.state));
      expect(d.error).toBeUndefined();
      expect(d.events.find((e) => e.type === 'roll')).toMatchObject({ results: p.state.slotPreview!.results });
      c = d.state;
    }
    expect(c.allies[0].slotPreviewUsed).toBe(2);
    const third = applyCommand(c, preview(c));
    expect(third.error).toBeDefined();
    // 次のターンになっても戻らない（戦闘ごとの回数）
    const next = endTurn(c).state;
    expect(applyCommand(next, preview(next)).error).toBeDefined();
  });

  it('見た結果・振り直しの結果は、何度やり直しても・保存して再開しても同じ', () => {
    const c = s();
    const cmd = preview(c, 1);
    const copy = clone(c);
    const first = applyCommand(c, cmd);
    for (let n = 0; n < 10; n++) expect(applyCommand(c, cmd)).toEqual(first);
    expect(c).toEqual(copy);
    // 保存して再開（JSON にして戻す）
    const resumed: BattleState = JSON.parse(JSON.stringify(first.state));
    expect(resumed.slotPreview).toEqual(first.state.slotPreview);
    const a = applyCommand(applyCommand(first.state, reroll(first.state)).state, confirm(first.state));
    const b = applyCommand(applyCommand(resumed, reroll(resumed)).state, confirm(resumed));
    expect(a.error).toBeUndefined();
    expect(b.events).toEqual(a.events);
    expect(JSON.parse(JSON.stringify(b.state))).toEqual(JSON.parse(JSON.stringify(a.state)));
    expect(a.events.find((e) => e.type === 'roll')).toMatchObject({ results: first.state.slotPreview!.rerollResults });
    // 2回目の先読みも、同じ状態からなら同じ結果
    const again = preview(a.state, 0);
    expect(applyCommand(a.state, again)).toEqual(applyCommand(clone(a.state), again));
  });
});

describe('歯車の守護鎧《歯車の番兵》', () => {
  it('戦闘の始めに番兵が1体いて、毎ターンの終わりに敵を攻撃する。いなくならない', () => {
    let c = battle(['warrior'], [{ armor: 'gearGuardian' }]);
    expect(c.allies[0].summons?.map((x) => x.id)).toEqual(['gearSentinel']);
    for (let turn = 0; turn < 3; turn++) {
      const before = c.enemies[0].hp;
      const r = endTurn(c);
      expect(fired(r.events, '歯車の番兵'), `${turn + 1}ターン目`).toBe(1);
      expect(before - r.state.enemies[0].hp).toBeGreaterThanOrEqual(3);
      expect(before - r.state.enemies[0].hp).toBeLessThanOrEqual(6);
      c = r.state;
      expect(c.allies[0].summons?.length).toBe(1);
    }
  });
  it('鎧を着ていない仲間には番兵がいない', () => {
    const c = battle(['warrior', 'mage'], [{ armor: 'gearGuardian' }, {}]);
    expect(c.allies[1].summons ?? []).toEqual([]);
  });
});

describe('夜明けの外套《夜明けの加護》', () => {
  const s = () => battle(['warrior'], [{ armor: 'dawnMantle' }]);
  it('フォーカスを使ってカードを使うと、ブロック5とカード1枚。1ターンに1回', () => {
    const c = s();
    const block = c.allies[0].block;
    let r = use(c, 0, 'strike', 1);
    expect(fired(r.events, '夜明けの加護')).toBe(1);
    expect(r.state.allies[0].block).toBe(block + 5);
    expect(r.state.allies[0].hand.length).toBe(1);
    r = use(r.state, 0, 'strike', 1);
    expect(fired(r.events, '夜明けの加護')).toBe(0);
    expect(r.state.allies[0].hand.length).toBe(0);
    const next = endTurn(r.state).state;
    expect(fired(use(next, 0, 'strike', 1).events, '夜明けの加護')).toBe(1);
  });
  it('フォーカスを使わなければ起きず、その後フォーカスを使えば起きる', () => {
    let r = use(s(), 0, 'strike', 0);
    expect(fired(r.events, '夜明けの加護')).toBe(0);
    r = use(r.state, 0, 'strike', 1);
    expect(fired(r.events, '夜明けの加護')).toBe(1);
  });
});

describe('星屑の鎧《降る星屑》', () => {
  const s = () => battle(['warrior', 'mage'], [{ armor: 'stardustArmor' }, {}]);
  it('2枠以上のカードが完全成功すると、味方全員に応援1。1ターンに1回', () => {
    let r = use(s(), 0, 'iceLance', 'perfect');
    expect(fired(r.events, '降る星屑')).toBe(1);
    expect(r.state.allies.map((a) => st(a, 'inspired'))).toEqual([1, 1]);
    r = use(r.state, 0, 'fireball', 'perfect');
    expect(fired(r.events, '降る星屑')).toBe(0);
  });
  it('1枠のカード・完全成功でない時は起きない。仲間が使っても起きない', () => {
    let r = use(s(), 0, 'strike', 'perfect');
    expect(fired(r.events, '降る星屑')).toBe(0);
    r = use(r.state, 0, 'iceLance', 'miss');
    expect(fired(r.events, '降る星屑')).toBe(0);
    r = use(r.state, 1, 'iceLance', 'perfect');
    expect(fired(r.events, '降る星屑')).toBe(0);
    expect(r.state.allies.map((a) => st(a, 'inspired'))).toEqual([0, 0]);
  });
});

describe('火花の指輪《散る火花》', () => {
  const s = (enemies = 1) => battle(['warrior'], [{ accessory: 'sparkRing' }], { enemies });
  it('コスト0のカードを使うと、敵に雷3ダメージと火傷1。1ターンに1回', () => {
    const c = s();
    const hp = c.enemies[0].hp;
    let r = use(c, 0, 'battleCry');
    expect(fired(r.events, '散る火花')).toBe(1);
    expect(hp - r.state.enemies[0].hp).toBeGreaterThanOrEqual(3);
    expect(hp - r.state.enemies[0].hp).toBeLessThanOrEqual(6);
    expect(st(r.state.enemies[0], 'burn')).toBe(1);
    const hp2 = r.state.enemies[0].hp;
    r = use(r.state, 0, 'battleCry');
    expect(fired(r.events, '散る火花')).toBe(0);
    expect(r.state.enemies[0].hp).toBe(hp2);
  });
  it('コスト1以上のカードでは起きない', () => {
    const r = use(s(), 0, 'strike', 'perfect');
    expect(fired(r.events, '散る火花')).toBe(0);
    expect(st(r.state.enemies[0], 'burn')).toBe(0);
  });
  it('敵が3体でも、同じ種なら同じ敵に当たる（乱数は戦闘の乱数だけを使う）', () => {
    const a = use(s(3), 0, 'battleCry'), b = use(s(3), 0, 'battleCry');
    expect(b.state).toEqual(a.state);
    expect(a.state.enemies.reduce((n, e) => n + st(e, 'burn'), 0)).toBe(1);
  });
});

describe('レア以下の「中身が同じ」装備に付けた差', () => {
  const sum = (id: string) => Object.values(getItem(id).stats ?? {}).reduce((n, v) => n + (v ?? 0), 0);
  const cardsOf = (id: string) => (getItem(id).cards ?? []).map((c) => c.cardId);

  it('シナリオ限定のレア以下の装備に、中身がまったく同じ物は無い', () => {
    const seen = new Map<string, string>();
    const same: string[] = [];
    // エピック以上の残り（鎧4つ・装飾品5つ）は lineupGuards の KNOWN_SAME_ABILITY_GROUPS で見張っている（フェーズ1後半で直す）
    for (const i of ITEMS.all.filter((x) => x.scenario && x.slot !== 'consumable' && x.rarity !== 'epic' && x.rarity !== 'legend')) {
      // 名前・説明・絵・印・出る場所のほかが全部同じなら「中身が同じ」
      const { id: _id, name: _name, description: _d, icon: _icon, scenario: _s, tags: _t, ability, ...rest } = i;
      const key = JSON.stringify([rest, ability?.effect ?? null]);
      if (seen.has(key)) same.push(`${seen.get(key)} = ${i.id}`);
      else seen.set(key, i.id);
    }
    expect(same).toEqual([]);
  });

  it('槍・弓・短剣: 付く技がそれぞれ違い、付く技は実在する', () => {
    for (const group of [['harpoon', 'lullabySpear', 'angelSpear', 'gearSpear'], ['blizzardBow', 'desertBow', 'clockworkBow'], ['mermaidDagger', 'pillowDagger', 'whiteWolfFang', 'moonDagger', 'scorpionSting']]) {
      const cards = group.map((id) => cardsOf(id).join('+'));
      expect(new Set(cards).size, group.join('/')).toBe(group.length);
      for (const id of group) for (const c of cardsOf(id)) expect(getCard(c).name.length).toBeGreaterThan(0);
    }
  });

  it('能力値の合計は、直す前と同じ（強さは変えず、向きだけ変えた）', () => {
    const totals: Record<string, number> = {
      harpoon: 8, lullabySpear: 8, angelSpear: 8, blizzardBow: 8, desertBow: 8, mermaidDagger: 7, pillowDagger: 7, whiteWolfFang: 7, moonDagger: 7,
      engineerGoggles: 4, dreamCatcher: 4, oldStarChart: 4, oldCompass: 4, pearlNecklace: 9, sacredScarab: 9,
    };
    for (const [id, n] of Object.entries(totals)) expect(sum(id), id).toBe(n);
  });

  it('断熱コート・砂漠の外套・雲の外套: 軽減する属性は元のまま、守りの形が違う', () => {
    expect([getItem('insulatedCoat').maxHp, getItem('insulatedCoat').startBlock]).toEqual([10, 2]);
    expect([getItem('desertCloak').maxHp, getItem('desertCloak').startBlock]).toEqual([6, 4]);
    expect([getItem('cloudCloak').maxHp, getItem('cloudCloak').startBlock, getItem('cloudCloak').stats]).toEqual([6, undefined, { agi: 2 }]);
    expect(getItem('insulatedCoat').ability!.effect).toMatchObject({ modifier: 'elementGuard', element: 'fire', mode: 'half' });
    expect(getItem('desertCloak').ability!.effect).toMatchObject({ modifier: 'elementGuard', element: 'fire', mode: 'half' });
    expect(getItem('cloudCloak').ability!.effect).toMatchObject({ modifier: 'elementGuard', element: 'thunder', mode: 'half' });
    expect(getItem('insulatedCoat').ability!.name).not.toBe(getItem('desertCloak').ability!.name);
  });
});
