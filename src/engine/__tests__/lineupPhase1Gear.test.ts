// ラインナップの見直し フェーズ1: シナリオ限定の装備のうち、今ある部品だけで作る7つ（docs/tasks/lineup-plan.md の 1-A）
// 実際の戦闘の流れ（createBattle → カードを使う → ターンを進める）で、1つずつ確かめる。
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CARDS, getCard } from '../../data/cards';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, getItem } from '../../data/items';
import type { BattleEvent, BattleState, PlayerId } from '../../types';
import { applyCommand, chanceFor, createBattle, createGame, createRng, describeAbility, toPartyMember } from '../index';
import { giveHand } from './helpers';

// 何もしない敵（味方のHP・状態異常を動かさない）と、殴るだけの敵
ENEMIES.register({ id: 'lineupGearIdler', name: '確認用の置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 1 }] }] });
ENEMIES.register({ id: 'lineupGearHitter', name: '確認用の殴る敵', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'hit', name: '殴る', effects: [{ kind: 'damage', amount: 8 }] }] });

type Gear = { armor?: string; accessory?: string };
const CLASSES4 = ['warrior', 'mage', 'hunter', 'guardian'];

/** 冒険のキャラに装備を持たせて、本番と同じ道（toPartyMember）で戦闘を作る */
function battle(classes: string[], gear: Gear[], opts: { enemies?: number; enemy?: string; seed?: number } = {}): BattleState {
  const seed = opts.seed ?? 11;
  const g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: `P${i + 1}` as PlayerId })) });
  g.heroes.forEach((h, i) => {
    const x = gear[i] ?? {};
    if (x.armor) h.equipment.armor = { uid: `x${i}a`, itemId: x.armor };
    if (x.accessory) h.equipment.accessory = { uid: `x${i}c`, itemId: x.accessory };
  });
  return createBattle({ seed, party: g.heroes.map(toPartyMember), encounter: { id: 'lineupGear', name: '確認', enemies: Array.from({ length: opts.enemies ?? 1 }, () => ({ defId: opts.enemy ?? 'lineupGearIdler' })) } });
}

/** 最初の2回の判定が必ず外れる乱数の種（成功率の上限95%でも外れる） */
const MISS_SEED = (() => {
  for (let seed = 1; seed < 200000; seed++) {
    const p = createRng(seed);
    if (p.next() >= 0.96 && p.next() >= 0.96) return seed;
  }
  throw new Error('外れる種が見つからない');
})();

/** index 番目の味方が、その担当プレイヤーとして、カードを1枚使う（手札はそのカード1枚に差し替える。マナは10にそろえる） */
function use(s: BattleState, index: number, cardId: string, mode: 'perfect' | 'miss' | number = 0) {
  const a = s.allies[index];
  const card = getCard(cardId);
  giveHand(s, a.id, [cardId]);
  a.mana = 10;
  a.focus = 6;
  if (mode === 'miss') s.rngState = MISS_SEED;
  const focusUsed = mode === 'perfect' ? card.slots : mode === 'miss' ? 0 : mode;
  const r = applyCommand(s, { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: 't0', focusUsed, targetId: card.target === 'enemy' ? s.enemies[0].uid : undefined });
  expect(r.error, `${cardId}: ${r.error}`).toBeUndefined();
  const roll = r.events.find((e): e is Extract<BattleEvent, { type: 'roll' }> => e.type === 'roll')!;
  if (mode === 'perfect') expect(roll.perfect).toBe(true);
  if (mode === 'miss') expect(roll.successes).toBe(0);
  return { state: r.state, events: r.events, roll };
}

/** ターン終了 → 敵フェーズを最後まで → 次の味方のターンの開始まで */
function endTurn(s: BattleState) {
  const events: BattleEvent[] = [];
  let r = applyCommand(s, { type: 'END_TURN', playerId: 'P1' });
  expect(r.error).toBeUndefined();
  events.push(...r.events);
  let guard = 0;
  while (r.state.phase === 'enemy' && guard++ < 20) {
    r = applyCommand(r.state, { type: 'ENEMY_STEP' });
    events.push(...r.events);
  }
  expect(r.state.phase).toBe('ally');
  return { state: r.state, events };
}

const fired = (events: BattleEvent[], name: string) => events.filter((e) => e.type === 'ability' && e.name === name).length;
const st = (u: { statuses: Record<string, number | undefined> }, id: string) => u.statuses[id] ?? 0;

describe('7つの装備のデータ（id・能力値・能力の説明・印）', () => {
  const rows: { id: string; slot: string; rarity: string; scenario: string | undefined; stats?: Record<string, number>; maxHp?: number; tags: string[]; name: string; text: string }[] = [
    { id: 'starRingCrown', slot: 'accessory', rarity: 'legend', scenario: 'starCastle', stats: { per: 8, int: 6 }, tags: ['mana', 'draw'], name: '星々の導き', text: '戦闘開始時：マナ+2、カードを1枚引く' },
    { id: 'royalBreastplate', slot: 'armor', rarity: 'epic', scenario: 'sandDynasty', maxHp: 12, tags: ['weak', 'vulnerable'], name: '王の威厳', text: '戦闘開始時：敵全員に「弱体」1、敵全員に「脆弱」1' },
    { id: 'coolantFlask', slot: 'accessory', rarity: 'epic', scenario: undefined, stats: { vit: 4 }, tags: ['draw', 'free'], name: '冷却', text: 'カードを使った後（そのターンの3枚目から・1ターンに1回）：カードを1枚引く' },
    { id: 'mistLantern', slot: 'accessory', rarity: 'epic', scenario: 'cursedArchipelago', stats: { vit: 4 }, tags: ['heavy', 'highCost'], name: '霧を払う光', text: 'そのターンに最初に使うカードの成功率+15%' },
    { id: 'clearMindCharm', slot: 'accessory', rarity: 'epic', scenario: 'dreamLabyrinth', stats: { vit: 4 }, tags: ['focus'], name: '澄みわたる心', text: '完全成功時（1ターンに1回）：悪い状態異常をすべて治す' },
    { id: 'moonAmulet', slot: 'accessory', rarity: 'epic', scenario: 'sandDynasty', stats: { vit: 4 }, tags: ['mana', 'heal'], name: '月の満ち欠け', text: '3ターンごとの開始時（3・6・9ターン目…）：マナ+1、HPを3回復' },
    { id: 'clockworkWatch', slot: 'accessory', rarity: 'epic', scenario: 'starCastle', stats: { vit: 4 }, tags: ['mana', 'draw'], name: '時を戻す', text: 'カードのスロットが全部失敗した時（1回の戦闘で1回まで）：マナ+2、カードを1枚引く' },
  ];
  for (const row of rows) {
    it(`${row.id}: id・場所・レア度はそのまま。能力値・印・能力の説明が新しい効果に合っている`, () => {
      const item = getItem(row.id);
      expect(item.slot).toBe(row.slot);
      expect(item.rarity).toBe(row.rarity);
      expect(item.scenario).toBe(row.scenario);
      expect(item.stats).toEqual(row.stats);
      expect(item.maxHp).toBe(row.maxHp);
      expect(item.tags).toEqual(row.tags);
      expect(item.ability!.name).toBe(row.name);
      expect(describeAbility(item.ability!)).toBe(row.text);
      // 前の効果の文が残っていない
      expect(item.description).not.toContain('悪い状態異常が治る。');
      expect(item.description).not.toContain('ブロック');
      expect(item.description.length).toBeGreaterThan(8);
    });
  }

  it('能力の名前が、ほかの装備と重ならない', () => {
    for (const row of rows) {
      const same = ITEMS.all.filter((i) => i.ability?.name === row.name).map((i) => i.id);
      expect(same, row.name).toEqual([row.id]);
    }
  });

  it('説明文を上書きした3つは、実際の部品と意味が合っている', () => {
    // 霧払いのランタン: このターンにまだカードを使っていない時だけ、成功率+15%
    expect(getItem('mistLantern').ability!.effect).toEqual({ modifier: 'cardChance', bonus: 15, if: [{ kind: 'playedAtMost', count: 0 }] });
    // 月の首飾り: ターン開始時・3回ごと
    expect(getItem('moonAmulet').ability!.effect).toEqual({ when: 'turnStart', if: [{ kind: 'everyN', n: 3, key: 'moonAmulet' }], do: [{ kind: 'gainMana', amount: 1 }, { kind: 'heal', amount: 3, to: 'self' }] });
    // 時計仕掛けの懐中時計: 枠のあるカードで成功0・1戦闘1回
    expect(getItem('clockworkWatch').ability!.effect).toEqual({ when: 'afterCard', if: [{ kind: 'cardSlots', min: 1 }, { kind: 'successesAtMost', count: 0 }, { kind: 'perBattle', key: 'clockworkWatch', max: 1 }], do: [{ kind: 'gainMana', amount: 2 }, { kind: 'draw', amount: 1 }] });
  });
});

describe('星環の冠《星々の導き》', () => {
  it('能力値は 感知+8・知力+6（体力は上がらない）', () => {
    const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'mage', gender: 'female', name: 'A', playerId: 'P1' }] });
    const before = toPartyMember(g.heroes[0]).stats!;
    g.heroes[0].equipment.accessory = { uid: 'x', itemId: 'starRingCrown' };
    const after = toPartyMember(g.heroes[0]).stats!;
    expect(after.per - before.per).toBe(8);
    expect(after.int - before.int).toBe(6);
    expect(after.vit - before.vit).toBe(0);
  });

  it('戦闘の1ターン目に、マナ+2・カード+1枚（1ターン目の準備で消えない）。2ターン目からは普通', () => {
    const base = battle(['mage'], [{}]);
    const s = battle(['mage'], [{ accessory: 'starRingCrown' }]);
    expect(s.turn).toBe(1);
    expect(base.allies[0].mana).toBe(BALANCE.manaPerTurn);
    expect(s.allies[0].mana).toBe(BALANCE.manaPerTurn + 2);
    expect(s.allies[0].hand).toHaveLength(base.allies[0].hand.length + 1);
    const t2 = endTurn(s);
    expect(t2.state.turn).toBe(2);
    expect(t2.state.allies[0].mana).toBe(BALANCE.manaPerTurn);
    expect(t2.state.allies[0].hand).toHaveLength(endTurn(base).state.allies[0].hand.length);
    expect(fired(t2.events, '星々の導き')).toBe(0);
  });

  for (const n of [2, 3, 4]) {
    it(`${n}人: 持ち主だけに効く（持ち主は最後の席）`, () => {
      const classes = CLASSES4.slice(0, n);
      const base = battle(classes, []);
      const s = battle(classes, classes.map((_, i) => (i === n - 1 ? { accessory: 'starRingCrown' } : {})));
      for (let i = 0; i < n; i++) {
        const owner = i === n - 1;
        expect(s.allies[i].mana, `mana ${i}`).toBe(BALANCE.manaPerTurn + (owner ? 2 : 0));
        expect(s.allies[i].hand.length, `hand ${i}`).toBe(base.allies[i].hand.length + (owner ? 1 : 0));
      }
    });
  }
});

describe('王家の胸当て《王の威厳》', () => {
  it('最大HP+12はそのまま', () => {
    const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'female', name: 'A', playerId: 'P1' }] });
    delete g.heroes[0].equipment.armor; // 最初の鎧を外した時と比べる
    const before = toPartyMember(g.heroes[0]).maxHp!;
    g.heroes[0].equipment.armor = { uid: 'x', itemId: 'royalBreastplate' };
    expect(toPartyMember(g.heroes[0]).maxHp! - before).toBe(12);
  });

  it('戦闘開始時、敵全員に弱体1・脆弱1。味方には付かない', () => {
    const base = battle(['warrior'], [{}], { enemies: 3 });
    const s = battle(['warrior'], [{ armor: 'royalBreastplate' }], { enemies: 3 });
    expect(s.enemies).toHaveLength(3);
    for (const e of base.enemies) expect([st(e, 'weak'), st(e, 'vulnerable')]).toEqual([0, 0]);
    for (const e of s.enemies) expect([st(e, 'weak'), st(e, 'vulnerable')]).toEqual([1, 1]);
    expect([st(s.allies[0], 'weak'), st(s.allies[0], 'vulnerable')]).toEqual([0, 0]);
  });

  it('1ターン目: こちらの攻撃は脆弱で増え、敵の攻撃は弱体で減る。2ターン目には消えている', () => {
    const base = battle(['mage'], [{}], { enemy: 'lineupGearHitter' });
    const s = battle(['mage'], [{ armor: 'royalBreastplate' }], { enemy: 'lineupGearHitter' });
    // こちらの攻撃（完全成功のストライク）
    const b1 = use(base, 0, 'strike', 'perfect');
    const s1 = use(s, 0, 'strike', 'perfect');
    const dealtBase = base.enemies[0].hp - b1.state.enemies[0].hp;
    const dealt = s.enemies[0].hp - s1.state.enemies[0].hp;
    expect(dealtBase).toBeGreaterThan(0);
    expect(dealt).toBeGreaterThan(dealtBase);
    // 敵の攻撃（8ダメージ → 弱体で6）
    const b2 = endTurn(b1.state);
    const s2 = endTurn(s1.state);
    const hurtBase = b1.state.allies[0].hp - b2.state.allies[0].hp;
    const hurt = s1.state.allies[0].hp - s2.state.allies[0].hp;
    expect(hurtBase).toBe(8);
    expect(hurt).toBe(6);
    // 2ターン目: 1ずつなので、もう残っていない
    expect([st(s2.state.enemies[0], 'weak'), st(s2.state.enemies[0], 'vulnerable')]).toEqual([0, 0]);
    expect(fired(s2.events, '王の威厳')).toBe(0);
  });

  for (const n of [2, 3, 4]) {
    it(`${n}人: 持ち主が1人なら、敵全員に1ずつ（持ち主以外の味方の数で増えない）`, () => {
      const classes = CLASSES4.slice(0, n);
      const s = battle(classes, classes.map((_, i) => (i === n - 1 ? { armor: 'royalBreastplate' } : {})), { enemies: 2 });
      for (const e of s.enemies) expect([st(e, 'weak'), st(e, 'vulnerable')]).toEqual([1, 1]);
      for (const a of s.allies) expect([st(a, 'weak'), st(a, 'vulnerable')]).toEqual([0, 0]);
    });
  }
});

describe('冷却水のフラスコ《冷却》', () => {
  it('同じターンの3枚目でカードを1枚引く。4枚目では引かない（1ターン1回）。次のターンはまた3枚目で引く', () => {
    let s = battle(['warrior'], [{ accessory: 'coolantFlask' }]);
    for (let turn = 1; turn <= 2; turn++) {
      const hands: number[] = [];
      const fires: number[] = [];
      for (let k = 0; k < 4; k++) {
        const r = use(s, 0, 'guard');
        hands.push(r.state.allies[0].hand.length);
        fires.push(fired(r.events, '冷却'));
        s = r.state;
      }
      // 手札は使う1枚だけに差し替えているので、使った後は0枚。引いた時だけ1枚
      expect(hands, `turn ${turn}`).toEqual([0, 0, 1, 0]);
      expect(fires, `turn ${turn}`).toEqual([0, 0, 1, 0]);
      s = endTurn(s).state;
    }
  });

  it('装備が無ければ、3枚目でも引かない', () => {
    let s = battle(['warrior'], [{}]);
    for (let k = 0; k < 3; k++) s = use(s, 0, 'guard').state;
    expect(s.allies[0].hand).toHaveLength(0);
  });

  for (const n of [2, 3, 4]) {
    it(`${n}人: 持ち主以外のカードは数えない・発動しない。引くのは持ち主だけ`, () => {
      const classes = CLASSES4.slice(0, n);
      const owner = n - 1;
      let s = battle(classes, classes.map((_, i) => (i === owner ? { accessory: 'coolantFlask' } : {})));
      // 持ち主以外が3枚ずつ使う → 誰も引かない
      for (let i = 0; i < owner; i++) {
        for (let k = 0; k < 3; k++) {
          const r = use(s, i, 'guard');
          expect(fired(r.events, '冷却')).toBe(0);
          expect(r.state.allies[i].hand).toHaveLength(0);
          s = r.state;
        }
      }
      // 持ち主の1・2枚目では出ない（味方の枚数は数えていない）。3枚目で、持ち主だけが引く
      const others = s.allies.map((a) => a.hand.length);
      for (let k = 0; k < 2; k++) {
        const r = use(s, owner, 'guard');
        expect(fired(r.events, '冷却')).toBe(0);
        s = r.state;
      }
      const r = use(s, owner, 'guard');
      expect(fired(r.events, '冷却')).toBe(1);
      expect(r.state.allies[owner].hand).toHaveLength(1);
      for (let i = 0; i < owner; i++) expect(r.state.allies[i].hand.length).toBe(others[i]);
    });
  }
});

describe('霧払いのランタン《霧を払う光》', () => {
  it('そのターンの最初のカードだけ成功率+15%（上限95%）。2枚目からは元通り。次のターンはまた最初の1枚に付く', () => {
    const base = battle(['mage'], [{}]);
    let s = battle(['mage'], [{ accessory: 'mistLantern' }]);
    const cards = ['strike', 'guard', 'heavySwing', 'gambleBolt', 'meditate'].map((id) => getCard(id));
    let full = 0;
    for (const c of cards) {
      const b = chanceFor(base.allies[0], c);
      expect(chanceFor(s.allies[0], c), c.id).toBe(Math.min(BALANCE.chanceMax, b + 15));
      if (chanceFor(s.allies[0], c) === b + 15) full++;
    }
    expect(full).toBeGreaterThan(0); // 上限に当たらず、まるごと+15%になるカードがある
    // 実際の判定にも使われる（1枚目）
    const heavy = getCard('heavySwing');
    const want = chanceFor(base.allies[0], heavy);
    const r1 = use(s, 0, 'heavySwing');
    expect(r1.roll.chance).toBe(Math.min(BALANCE.chanceMax, want + 15));
    s = r1.state;
    // 2枚目からは付かない
    for (const c of cards) expect(chanceFor(s.allies[0], c), c.id).toBe(chanceFor(base.allies[0], c));
    const r2 = use(s, 0, 'heavySwing');
    expect(r2.roll.chance).toBe(want);
    // 次のターン
    s = endTurn(r2.state).state;
    expect(chanceFor(s.allies[0], heavy)).toBe(Math.min(BALANCE.chanceMax, want + 15));
  });

  for (const n of [2, 3, 4]) {
    it(`${n}人: 持ち主だけに付く。味方がカードを使っても、持ち主の最初の1枚の分は残る`, () => {
      const classes = CLASSES4.slice(0, n);
      const owner = n - 1;
      const base = battle(classes, []);
      let s = battle(classes, classes.map((_, i) => (i === owner ? { accessory: 'mistLantern' } : {})));
      const heavy = getCard('heavySwing');
      for (let i = 0; i < owner; i++) expect(chanceFor(s.allies[i], heavy), `ally ${i}`).toBe(chanceFor(base.allies[i], heavy));
      for (let i = 0; i < owner; i++) s = use(s, i, 'guard').state;
      const want = Math.min(BALANCE.chanceMax, chanceFor(base.allies[owner], heavy) + 15);
      expect(chanceFor(s.allies[owner], heavy)).toBe(want);
      expect(use(s, owner, 'heavySwing').roll.chance).toBe(want);
    });
  }
});

describe('澄んだ心のお守り《澄みわたる心》', () => {
  const sick = (s: BattleState, i: number) => Object.assign(s.allies[i].statuses, { poison: 2, weak: 1, regen: 2 });

  it('完全成功で、自分の悪い状態異常がすべて治る（良い状態はそのまま）。完全成功でなければ治らない', () => {
    const s = battle(['warrior'], [{ accessory: 'clearMindCharm' }]);
    sick(s, 0);
    const miss = use(s, 0, 'strike', 'miss');
    expect([st(miss.state.allies[0], 'poison'), st(miss.state.allies[0], 'weak')]).toEqual([2, 1]);
    expect(fired(miss.events, '澄みわたる心')).toBe(0);
    // 2枠のカードで1枠だけ成功（完全成功ではない）
    const half = use(miss.state, 0, 'shieldBash', 1);
    if (!half.roll.perfect) expect(st(half.state.allies[0], 'poison')).toBe(2);
    const s2 = battle(['warrior'], [{ accessory: 'clearMindCharm' }]);
    sick(s2, 0);
    const ok = use(s2, 0, 'strike', 'perfect');
    expect([st(ok.state.allies[0], 'poison'), st(ok.state.allies[0], 'weak')]).toEqual([0, 0]);
    expect(st(ok.state.allies[0], 'regen')).toBe(2);
    expect(fired(ok.events, '澄みわたる心')).toBe(1);
  });

  it('1ターンに1回。次のターンはまた治る', () => {
    let s = battle(['warrior'], [{ accessory: 'clearMindCharm' }]);
    sick(s, 0);
    s = use(s, 0, 'strike', 'perfect').state;
    expect(st(s.allies[0], 'poison')).toBe(0);
    sick(s, 0);
    const again = use(s, 0, 'strike', 'perfect');
    expect(st(again.state.allies[0], 'poison')).toBe(2);
    expect(fired(again.events, '澄みわたる心')).toBe(0);
    s = endTurn(again.state).state;
    s.allies[0].statuses = {};
    sick(s, 0);
    s = use(s, 0, 'strike', 'perfect').state;
    expect([st(s.allies[0], 'poison'), st(s.allies[0], 'weak')]).toEqual([0, 0]);
  });

  it('治す物が無い完全成功でも、そのターンの1回を使う（今の部品の決まり）', () => {
    let s = battle(['warrior'], [{ accessory: 'clearMindCharm' }]);
    s = use(s, 0, 'strike', 'perfect').state;
    sick(s, 0);
    s = use(s, 0, 'strike', 'perfect').state;
    expect(st(s.allies[0], 'poison')).toBe(2);
  });

  for (const n of [2, 3, 4]) {
    it(`${n}人: 持ち主の完全成功だけで発動し、治るのは持ち主だけ`, () => {
      const classes = CLASSES4.slice(0, n);
      const owner = n - 1;
      let s = battle(classes, classes.map((_, i) => (i === owner ? { accessory: 'clearMindCharm' } : {})));
      for (let i = 0; i < n; i++) sick(s, i);
      // 持ち主以外の完全成功では、誰も治らない
      for (let i = 0; i < owner; i++) {
        const r = use(s, i, 'guard', 'perfect');
        expect(fired(r.events, '澄みわたる心')).toBe(0);
        s = r.state;
      }
      for (let i = 0; i < n; i++) expect(st(s.allies[i], 'poison'), `ally ${i}`).toBe(2);
      // 持ち主の完全成功で、持ち主だけ治る
      const r = use(s, owner, 'guard', 'perfect');
      expect(fired(r.events, '澄みわたる心')).toBe(1);
      for (let i = 0; i < n; i++) expect(st(r.state.allies[i], 'poison'), `ally ${i}`).toBe(i === owner ? 0 : 2);
    });
  }
});

describe('月の首飾り《月の満ち欠け》', () => {
  it('3・6ターン目の開始時に、マナ+1・HP3回復。ほかのターンは何も起きない', () => {
    let s = battle(['warrior'], [{ accessory: 'moonAmulet' }]);
    s.allies[0].hp = s.allies[0].maxHp - 20;
    const hp0 = s.allies[0].hp;
    const mana: number[] = [s.allies[0].mana];
    const hp: number[] = [s.allies[0].hp];
    const fires: number[] = [0];
    for (let turn = 2; turn <= 7; turn++) {
      const r = endTurn(s);
      s = r.state;
      expect(s.turn).toBe(turn);
      mana.push(s.allies[0].mana);
      hp.push(s.allies[0].hp);
      fires.push(fired(r.events, '月の満ち欠け'));
    }
    const M = BALANCE.manaPerTurn;
    expect(mana).toEqual([M, M, M + 1, M, M, M + 1, M]);
    expect(hp).toEqual([hp0, hp0, hp0 + 3, hp0 + 3, hp0 + 3, hp0 + 6, hp0 + 6]);
    expect(fires).toEqual([0, 0, 1, 0, 0, 1, 0]);
  });

  it('HPは最大HPを超えない（マナ+1は入る）', () => {
    let s = battle(['warrior'], [{ accessory: 'moonAmulet' }]);
    s.allies[0].hp = s.allies[0].maxHp - 1;
    s = endTurn(endTurn(s).state).state;
    expect(s.turn).toBe(3);
    expect(s.allies[0].hp).toBe(s.allies[0].maxHp);
    expect(s.allies[0].mana).toBe(BALANCE.manaPerTurn + 1);
  });

  for (const n of [2, 3, 4]) {
    it(`${n}人: 持ち主だけがマナ+1・HP3回復`, () => {
      const classes = CLASSES4.slice(0, n);
      const owner = n - 1;
      let s = battle(classes, classes.map((_, i) => (i === owner ? { accessory: 'moonAmulet' } : {})));
      for (const a of s.allies) a.hp = a.maxHp - 10;
      s = endTurn(endTurn(s).state).state;
      expect(s.turn).toBe(3);
      for (let i = 0; i < n; i++) {
        expect(s.allies[i].mana, `mana ${i}`).toBe(BALANCE.manaPerTurn + (i === owner ? 1 : 0));
        expect(s.allies[i].maxHp - s.allies[i].hp, `hp ${i}`).toBe(i === owner ? 7 : 10);
      }
    });
  }
});

describe('時計仕掛けの懐中時計《時を戻す》', () => {
  it('スロットが全部失敗した時、マナ+2・カード1枚。成功した時は出ない', () => {
    const s = battle(['warrior'], [{ accessory: 'clockworkWatch' }]);
    const ok = use(s, 0, 'strike', 'perfect');
    expect(fired(ok.events, '時を戻す')).toBe(0);
    expect(ok.state.allies[0].mana).toBe(10 - 1);
    expect(ok.state.allies[0].hand).toHaveLength(0);
    // 成功では「1戦闘に1回」を使っていないので、この後の全部失敗で出る
    const miss = use(ok.state, 0, 'strike', 'miss');
    expect(fired(miss.events, '時を戻す')).toBe(1);
    expect(miss.state.allies[0].mana).toBe(10 - 1 + 2);
    expect(miss.state.allies[0].hand).toHaveLength(1);
  });

  it('2枠のうち1枠が成功（全部失敗ではない）では出ない。その後の全部失敗で出る', () => {
    const s = battle(['warrior'], [{ accessory: 'clockworkWatch' }]);
    expect(getCard('shieldBash').slots).toBe(2);
    s.rngState = MISS_SEED;
    const half = use(s, 0, 'shieldBash', 1); // 1枠はフォーカスで成功、残りの1枠は外れる
    expect(half.roll.successes).toBe(1);
    expect(fired(half.events, '時を戻す')).toBe(0);
    expect(half.state.allies[0].hand).toHaveLength(0);
    const miss = use(half.state, 0, 'shieldBash', 'miss');
    expect(fired(miss.events, '時を戻す')).toBe(1);
    expect(miss.state.allies[0].mana).toBe(10 - 1 + 2);
    expect(miss.state.allies[0].hand).toHaveLength(1);
  });

  it('1回の戦闘で1回だけ（同じターンの2回目も、次のターンも出ない）', () => {
    let s = battle(['warrior'], [{ accessory: 'clockworkWatch' }]);
    s = use(s, 0, 'strike', 'miss').state;
    const again = use(s, 0, 'strike', 'miss');
    expect(fired(again.events, '時を戻す')).toBe(0);
    expect(again.state.allies[0].mana).toBe(10 - 1);
    expect(again.state.allies[0].hand).toHaveLength(0);
    s = endTurn(again.state).state;
    const next = use(s, 0, 'strike', 'miss');
    expect(fired(next.events, '時を戻す')).toBe(0);
    expect(next.state.allies[0].mana).toBe(10 - 1);
    expect(next.state.allies[0].hand).toHaveLength(0);
  });

  it('枠の無いカード（もしあれば）は「全部失敗」に数えない', () => {
    // 今は枠0のカードは無い。増えた時も、条件の「1枠以上のカード」で外れる
    expect(CARDS.all.filter((c) => c.slots === 0).map((c) => c.id)).toEqual([]);
    expect(getItem('clockworkWatch').ability!.effect).toMatchObject({ if: [{ kind: 'cardSlots', min: 1 }, { kind: 'successesAtMost', count: 0 }, { kind: 'perBattle', key: 'clockworkWatch', max: 1 }] });
  });

  for (const n of [2, 3, 4]) {
    it(`${n}人: 持ち主以外の失敗では出ない。出た時にもらうのは持ち主だけ`, () => {
      const classes = CLASSES4.slice(0, n);
      const owner = n - 1;
      let s = battle(classes, classes.map((_, i) => (i === owner ? { accessory: 'clockworkWatch' } : {})));
      for (let i = 0; i < owner; i++) {
        const r = use(s, i, 'strike', 'miss');
        expect(fired(r.events, '時を戻す')).toBe(0);
        expect(r.state.allies[i].mana).toBe(10 - 1);
        expect(r.state.allies[i].hand).toHaveLength(0);
        s = r.state;
      }
      const before = s.allies.map((a) => ({ mana: a.mana, hand: a.hand.length }));
      const r = use(s, owner, 'strike', 'miss');
      expect(fired(r.events, '時を戻す')).toBe(1);
      expect(r.state.allies[owner].mana).toBe(10 - 1 + 2);
      expect(r.state.allies[owner].hand).toHaveLength(1);
      for (let i = 0; i < owner; i++) expect({ mana: r.state.allies[i].mana, hand: r.state.allies[i].hand.length }).toEqual(before[i]);
    });
  }
});
