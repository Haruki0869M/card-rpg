// ラインナップの作り直し 区切りB（docs/tasks/lineup-impl-plan.md）
// 物理8種類の武器 122→46。武器ごとの能力（剣 = 完全成功をつなぐ、刀 = 一太刀、槍 = 守って返す、斧 = 捨て身、
// 槌 = 守りを力に、拳 = 手数と気、短剣 = 毒と身軽さ、弓 = 狙う）、保存の版 v19。
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, getItem } from '../../data/items';
import type { AllyState, BattleState, Command, GameState, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, createRng, describeAbility, migrateGame, toPartyMember } from '../index';
import { STATE_VERSION, chanceFor, rollChanceFor } from '../battle/battle';
import { cardChanceBonus, cardCostOf, damageModifiers, statusBonusOf } from '../abilities';
import { applyEffect, makeCtx } from '../battle/effects';
import { jobWeapons } from '../game/hero';

const wait = [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block' as const, amount: 0 }] }];
const dummy = { icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence' };
ENEMIES.register({ ...dummy, id: 'stageBIdler', name: '確認用の置物', maxHp: 100000, actions: wait });
ENEMIES.register({ ...dummy, id: 'stageBTiny', name: '確認用の小さな置物', maxHp: 1, actions: wait });
ENEMIES.register({ ...dummy, id: 'stageBHitter', name: '確認用の殴る置物', maxHp: 100000, actions: [{ id: 'hit', name: '殴る', effects: [{ kind: 'damage', amount: 5 }] }] });
ENEMIES.register({ ...dummy, id: 'stageBBig', name: '確認用の大技の置物', maxHp: 100000, actions: [{ id: 'big', name: '大技', big: true, effects: [{ kind: 'damage', amount: 5 }] }] });

const PHYS = ['sword', 'katana', 'spear', 'axe', 'hammer', 'fist', 'dagger', 'bow'];
const physWeapons = () => ITEMS.all.filter((i) => i.slot === 'weapon' && PHYS.includes(i.weaponType ?? ''));

type Opt = { enemies?: string[]; players?: PlayerId[]; boss?: boolean; midboss?: boolean };
function game(classes: string[], weapons: (string | undefined)[], players?: PlayerId[]): GameState {
  const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: players?.[i] ?? 'P1' })) });
  g.heroes.forEach((h, i) => { if (weapons[i]) h.equipment.weapon = { uid: `w${i}`, itemId: weapons[i]! }; else delete h.equipment.weapon; });
  return g;
}
/** 確認用の戦闘。マナとフォーカスはたっぷり、手札は空 */
function battle(classes: string[], weapons: (string | undefined)[], opt: Opt = {}): BattleState {
  const g = game(classes, weapons, opt.players);
  const s = createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'stageB', name: '確認', enemies: (opt.enemies ?? ['stageBIdler']).map((defId) => ({ defId })), ...(opt.boss ? { boss: true } : {}), ...(opt.midboss ? { midboss: true } : {}) } });
  for (const a of s.allies) { a.mana = 30; a.focus = 9; a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
let uid = 0;
/** カードを手札に足して使う。focus = 'max' なら全部の枠にフォーカス（必ず完全成功） */
function use(s: BattleState, cardId: string, o: { ally?: number; target?: number; focus?: number | 'max'; player?: PlayerId } = {}) {
  const a = s.allies[o.ally ?? 0], inst = { uid: `u${uid++}`, cardId };
  a.hand.push(inst);
  a.mana = Math.max(a.mana, 10);
  const card = getCard(cardId), focus = o.focus === 'max' ? card.slots : o.focus ?? 0;
  if (focus) a.focus = Math.max(a.focus, focus);
  const cmd: Command = { type: 'PLAY_CARD', playerId: o.player ?? a.playerId, characterId: a.id, cardInstanceId: inst.uid, targetId: card.target === 'enemy' ? s.enemies[o.target ?? 0].uid : undefined, focusUsed: focus };
  const r = applyCommand(s, cmd);
  expect(r.error, cardId).toBeUndefined();
  return r;
}
/** ターン終了 → 敵の番を最後まで */
function nextTurn(s: BattleState): BattleState {
  let st = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state;
  for (let i = 0; st.phase === 'enemy' && i < 20; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}
const st = (u: { statuses: Record<string, number | undefined> }, id: string) => u.statuses[id] ?? 0;
const strike = () => getCard('strike');
/** ストライクで先頭の敵を狙う時の、ダメージの倍率と足す量 */
const mods = (s: BattleState, a: AllyState = s.allies[0], perfect?: boolean) => damageModifiers(s, a, strike(), s.enemies[0], undefined, perfect);
/** 同じ場面で武器が無い時と比べた倍率 */
const ratio = (s: BattleState, bare: BattleState) => mods(s).multiplier / mods(bare).multiplier;
const hasAbility = (events: { type: string; name?: string }[], name: string) => events.some((e) => e.type === 'ability' && e.name === name);

describe('区切りB: 数', () => {
  it('物理8種類の武器は46本。種類ごとの数も決めたとおり', () => {
    const n: Record<string, number> = {};
    for (const w of physWeapons()) n[w.weaponType!] = (n[w.weaponType!] ?? 0) + 1;
    expect(n).toEqual({ sword: 7, katana: 5, spear: 6, axe: 6, hammer: 5, fist: 5, dagger: 6, bow: 6 });
    expect(physWeapons()).toHaveLength(46);
  });
  it('外した物は無い。レア度を動かした2本', () => {
    for (const id of ['venomSword', 'dreamEdge', 'dawnKatana', 'lullabySpear', 'meteorAxe', 'numbingHammer', 'lifespringWraps', 'moonDagger', 'galeBow', 'desertBow']) expect(ITEMS.tryGet(id), id).toBeUndefined();
    expect([getItem('sentinelSpear').rarity, getItem('sentinelSpear').stats]).toEqual(['epic', { str: 4, vit: 4 }]);
    expect([getItem('stillwaterWraps').rarity, getItem('stillwaterWraps').stats]).toEqual(['legend', { vit: 10, agi: 2 }]);
  });
  it('中身が同じ武器は無い。付くカードは実在し、能力の説明文がある', () => {
    const seen = new Map<string, string>(), same: string[] = [];
    for (const w of physWeapons()) {
      const key = JSON.stringify([w.weaponType, w.stats, w.cards, w.ability?.effect ?? null, w.ability?.also ?? null]);
      if (seen.has(key)) same.push(`${seen.get(key)} = ${w.id}`); else seen.set(key, w.id);
      for (const c of w.cards ?? []) expect(getCard(c.cardId).name.length, w.id).toBeGreaterThan(0);
      expect(w.description.length, w.id).toBeGreaterThan(0);
      if (w.ability) expect((w.ability.description ?? describeAbility(w.ability)).length, w.id).toBeGreaterThan(0);
      // コモンの最初の武器だけは能力なし。ほかは全部、能力を持つ
      if (w.rarity !== 'common') expect(w.ability, w.id).toBeDefined();
    }
    expect(same).toEqual([]);
  });
  it('どの種類にも、コモン・レア・エピック・レジェンドが1本以上ある（どのジョブも、各レア度で持てる武器がある）', () => {
    for (const t of PHYS) for (const r of ['common', 'rare', 'epic', 'legend']) expect(physWeapons().some((w) => w.weaponType === t && w.rarity === r && (r !== 'common' || !w.scenario)), `${t} ${r}`).toBe(true);
    for (const c of CLASSES.all) for (const r of ['common', 'rare', 'epic', 'legend']) {
      expect(ITEMS.all.some((i) => i.slot === 'weapon' && i.rarity === r && jobWeapons(c.id).includes(i.weaponType ?? '')), `${c.id} ${r}`).toBe(true);
    }
  });
});

describe('区切りB: 剣（完全成功をつなぐ）', () => {
  it('鋼の剣《見切り》: 物理カードの完全成功で応援1。1ターンに1回', () => {
    let s = battle(['warrior'], ['steelSword']);
    const r = use(s, 'strike', { focus: 'max' });
    expect(st(r.state.allies[0], 'inspired')).toBe(1);
    expect(hasAbility(r.events, '見切り')).toBe(true);
    s = use(r.state, 'strike', { focus: 'max' }).state; // 応援は使って消え、2回目は付かない
    expect(st(s.allies[0], 'inspired')).toBe(0);
    s = use(nextTurn(s), 'strike', { focus: 'max' }).state;
    expect(st(s.allies[0], 'inspired')).toBe(1);
  });
  it('熾火の剣《魔法剣》: 魔法カードの後、次の物理カード1枚だけ成功率+10%', () => {
    let s = battle(['warrior'], ['smolderSword']);
    const bonus = (x: BattleState) => cardChanceBonus(x.allies[0], strike(), x.enemies[0], x);
    expect(bonus(s)).toBe(0);
    s = use(s, 'magicArrow').state;
    expect(bonus(s)).toBe(10);
    expect(cardChanceBonus(s.allies[0], getCard('magicArrow'), s.enemies[0], s)).toBe(0);
    s = use(s, 'strike').state;
    expect(bonus(s)).toBe(0);
    s = use(s, 'magicArrow').state; // 1ターンに1回
    expect(bonus(s)).toBe(0);
  });
  it('ミスリルソード《白銀の冴え》: 完全成功で応援1。応援を持ったままターンを終えると、応援1つにつきブロック3', () => {
    const s = use(battle(['warrior'], ['mithrilSword']), 'strike', { focus: 'max' }).state;
    expect(st(s.allies[0], 'inspired')).toBe(1);
    expect(applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state.allies[0].block).toBe(3);
    const none = battle(['warrior'], ['mithrilSword']);
    expect(applyCommand(none, { type: 'END_TURN', playerId: 'P1' }).state.allies[0].block).toBe(0);
  });
  it('砂嵐の曲刀《砂嵐》: 物理カード3枚目で、敵全員に脆弱1。1ターンに1回', () => {
    let s = battle(['warrior'], ['sandstormBlade'], { enemies: ['stageBIdler', 'stageBIdler'] });
    s = use(use(s, 'strike').state, 'guard').state;
    s = use(s, 'strike').state;
    expect(s.enemies.map((e) => st(e, 'vulnerable'))).toEqual([0, 0]);
    s = use(s, 'strike').state;
    expect(s.enemies.map((e) => st(e, 'vulnerable'))).toEqual([1, 1]);
    s = use(s, 'strike').state;
    expect(s.enemies.map((e) => st(e, 'vulnerable'))).toEqual([1, 1]);
  });
  it('誓約の剣《誓約》: 完全成功で味方全員に応援1。1人の時は自分に2', () => {
    const duo = use(battle(['warrior', 'mage'], ['oathkeeperSword', undefined]), 'strike', { focus: 'max' }).state;
    expect(duo.allies.map((a) => st(a, 'inspired'))).toEqual([1, 1]);
    const solo = use(battle(['warrior'], ['oathkeeperSword']), 'strike', { focus: 'max' }).state;
    expect(st(solo.allies[0], 'inspired')).toBe(2);
  });
  it('協力プレイ: P2 のキャラの武器の能力も、P2 の操作で働く', () => {
    const s = battle(['mage', 'warrior'], [undefined, 'steelSword'], { players: ['P1', 'P2'] });
    const r = use(s, 'strike', { ally: 1, focus: 'max' });
    expect(st(r.state.allies[1], 'inspired')).toBe(1);
    expect(st(r.state.allies[0], 'inspired')).toBe(0);
  });
});

describe('区切りB: 刀（一太刀）', () => {
  it('鍛鉄の刀《初太刀》・天下無双: そのターン最初の物理カードだけ ×1.2 / ×1.3', () => {
    for (const [id, m] of [['forgedKatana', 1.2], ['peerlessKatana', 1.3]] as const) {
      let s = battle(['warrior'], [id]), bare = battle(['warrior'], [undefined]);
      expect(ratio(s, bare), id).toBeCloseTo(m);
      s = use(s, 'guard').state; bare = use(bare, 'guard').state; // 物理でないカードは数えない
      expect(ratio(s, bare), id).toBeCloseTo(m);
      s = use(s, 'strike').state; bare = use(bare, 'strike').state;
      expect(ratio(s, bare), id).toBeCloseTo(1);
      expect(ratio(nextTurn(s), nextTurn(bare)), id).toBeCloseTo(m);
    }
  });
  it('受け流しの刀《残心》: 物理カードを1枚だけ使ったターンの終わりに、ブロック5', () => {
    const end = (s: BattleState) => applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state.allies[0].block;
    const s0 = battle(['warrior'], ['guardKatana']);
    expect(end(s0)).toBe(0);
    const s1 = use(s0, 'strike').state;
    expect(end(s1)).toBe(5);
    expect(end(use(s1, 'strike').state)).toBe(0);
  });
  it('陣割りの刀《陣割り》: 最初の物理カードで倒すと、マナが戻り1枚引く。2枚目では起きない', () => {
    let s = battle(['warrior'], ['crowdcleaverKatana'], { enemies: ['stageBTiny', 'stageBTiny', 'stageBIdler'] });
    s.allies[0].mana = 10;
    const r = use(s, 'strike', { focus: 'max' });
    expect(r.state.enemies[0].dead).toBe(true);
    expect(r.state.allies[0].mana).toBe(10);
    expect(r.state.allies[0].hand).toHaveLength(1);
    expect(hasAbility(r.events, '陣割り')).toBe(true);
    r.state.allies[0].hand = [];
    s = use(r.state, 'strike', { target: 1, focus: 'max' }).state;
    expect(s.enemies[1].dead).toBe(true);
    expect(s.allies[0].mana).toBe(9);
    expect(s.allies[0].hand).toHaveLength(0);
  });
  it('天下無双: 最初の物理カードが完全成功なら、敵のブロックを無視する', () => {
    let s = battle(['warrior'], ['peerlessKatana']);
    s.enemies[0].block = 999;
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(s.enemies[0].hp).toBeLessThan(s.enemies[0].maxHp);
    expect(s.enemies[0].block).toBe(999);
    const hp = s.enemies[0].hp;
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(s.enemies[0].hp).toBe(hp);
  });
});

describe('区切りB: 槍（守って返す）', () => {
  it('鍛鋼の槍《槍構え》: 物理カードでダメージを与えるとブロック3。1ターンに1回', () => {
    let s = use(battle(['warrior'], ['temperedSpear']), 'strike', { focus: 'max' }).state;
    expect(s.allies[0].block).toBe(3);
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(s.allies[0].block).toBe(3);
  });
  it('均衡の槍《返しの穂先》: 敵の番にHPが減らなければ、次のターン最初の物理カード ×1.25。1ターン目と、HPが減った後は無し', () => {
    const s = battle(['warrior'], ['balancedSpear']), bare = battle(['warrior'], [undefined]);
    expect(ratio(s, bare)).toBeCloseTo(1);
    const s2 = nextTurn(s), bare2 = nextTurn(bare);
    expect(ratio(s2, bare2)).toBeCloseTo(1.25);
    expect(ratio(use(s2, 'strike').state, use(bare2, 'strike').state)).toBeCloseTo(1);
    const hit = nextTurn(battle(['warrior'], ['balancedSpear'], { enemies: ['stageBHitter'] }));
    expect(hit.allies[0].hp).toBeLessThan(500);
    expect(ratio(hit, nextTurn(battle(['warrior'], [undefined], { enemies: ['stageBHitter'] })))).toBeCloseTo(1);
  });
  it('均衡の槍: ブロックで防ぎきれば「HPが減らなかった」に入る', () => {
    const s = battle(['warrior'], ['balancedSpear'], { enemies: ['stageBHitter'] }), bare = battle(['warrior'], [undefined], { enemies: ['stageBHitter'] });
    const a = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state, b = applyCommand(bare, { type: 'END_TURN', playerId: 'P1' }).state;
    a.allies[0].block = 99; b.allies[0].block = 99;
    const step = (x: BattleState) => { let y = x; for (let i = 0; y.phase === 'enemy' && i < 20; i++) y = applyCommand(y, { type: 'ENEMY_STEP' }).state; return y; };
    const a2 = step(a), b2 = step(b);
    expect(a2.allies[0].hp).toBe(500);
    expect(ratio(a2, b2)).toBeCloseTo(1.25);
  });
  it('大物狩りの銛《大物狩り》: ボス・中ボスとの戦闘だけ、物理カードの成功率+10%', () => {
    const bonus = (opt: Opt) => { const s = battle(['warrior'], ['harpoon'], opt); return cardChanceBonus(s.allies[0], strike(), s.enemies[0], s); };
    expect(bonus({})).toBe(0);
    expect(bonus({ boss: true })).toBe(10);
    expect(bonus({ midboss: true })).toBe(10);
    const s = battle(['warrior'], ['harpoon'], { boss: true });
    expect(cardChanceBonus(s.allies[0], getCard('magicArrow'), s.enemies[0], s)).toBe(0);
  });
  it('不動の槍《不動》: 攻撃カードの後ブロック4（1ターンに1回）。無傷の次のターンは最初の物理カード ×1.3', () => {
    let s = use(battle(['warrior'], ['sentinelSpear']), 'strike').state;
    expect(s.allies[0].block).toBe(4);
    s = use(s, 'strike').state;
    expect(s.allies[0].block).toBe(4);
    expect(ratio(nextTurn(battle(['warrior'], ['sentinelSpear'])), nextTurn(battle(['warrior'], [undefined])))).toBeCloseTo(1.3);
  });
  it('竜王の槍《竜王の構え》: 無傷でしのぐたび構え1（最大3）、1つにつき物理+15%。HPが減ると全部消える。防ぎきれば消えない', () => {
    let s = battle(['warrior'], ['dragonlordSpear']), bare = battle(['warrior'], [undefined]);
    for (const n of [1, 2, 3, 3]) {
      s = nextTurn(s); bare = nextTurn(bare);
      expect(st(s.allies[0], 'stance')).toBe(n);
      expect(ratio(s, bare)).toBeCloseTo(1 + 0.15 * n);
    }
    const hit = (x: BattleState, block: number) => {
      x.allies[0].block = block;
      applyEffect(makeCtx(x, createRng(1), [], x.enemies[0]), { kind: 'damage', amount: 60, to: 'foes' });
    };
    hit(s, 999);
    expect(st(s.allies[0], 'stance')).toBe(3);
    hit(s, 0);
    expect(s.allies[0].hp).toBeLessThan(500);
    expect(st(s.allies[0], 'stance')).toBe(0);
  });
});

describe('区切りB: 斧（捨て身）', () => {
  it('鉄割りの斧《捨て身》: HPが半分以下の間だけ、物理カードの成功率+10%', () => {
    const s = battle(['warrior'], ['ironwoodAxe']);
    const bonus = () => cardChanceBonus(s.allies[0], strike(), s.enemies[0], s);
    expect(bonus()).toBe(0);
    s.allies[0].hp = 250;
    expect(bonus()).toBe(10);
    expect(cardChanceBonus(s.allies[0], getCard('magicArrow'), s.enemies[0], s)).toBe(0);
  });
  it('傷刻みの斧《返り血》: 敵を倒すとHP4回復。1ターンに1回', () => {
    let s = battle(['warrior'], ['notchedAxe'], { enemies: ['stageBTiny', 'stageBTiny', 'stageBIdler'] });
    s.allies[0].hp = 400;
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(s.allies[0].hp).toBe(404);
    s = use(s, 'strike', { target: 1, focus: 'max' }).state;
    expect(s.allies[0].hp).toBe(404);
  });
});

describe('区切りB: 槌（守りを力に）', () => {
  it('鋼の槌《盾打ち》: 自分にブロックがある間、物理カードの基本ダメージ+3（力などの倍率がかかるので、実際は3以上）', () => {
    const s = battle(['warrior'], ['steelHammer']);
    expect(mods(s).add ?? 0).toBe(0);
    s.allies[0].block = 1;
    expect(mods(s).add).toBe(3);
    const dealt = (block: number) => { const x = battle(['warrior'], ['steelHammer']); x.allies[0].block = block; return x.enemies[0].maxHp - use(x, 'strike', { focus: 'max' }).state.enemies[0].hp; };
    expect(dealt(5) - dealt(0)).toBeGreaterThanOrEqual(3);
    expect(dealt(5) - dealt(0)).toBeLessThanOrEqual(6);
    expect(damageModifiers(s, s.allies[0], getCard('magicArrow'), s.enemies[0]).add ?? 0).toBe(0);
  });
  it('釣合いの槌《守りの一打》: 完全成功で、いちばんHPが低い味方にブロック4。1ターンに1回', () => {
    let s = battle(['warrior', 'mage'], ['balancedHammer', undefined]);
    s.allies[1].hp = 10;
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(s.allies.map((a) => a.block)).toEqual([0, 4]);
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(s.allies.map((a) => a.block)).toEqual([0, 4]);
  });
  it('聖騎士の槌《守りの祈り》: 前のターンのブロックが残っていれば、ターン開始時にHP2回復', () => {
    const turn2 = (block: number) => {
      const s = battle(['warrior'], ['holyHammer']);
      s.allies[0].hp = 400;
      const e = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state;
      e.allies[0].block = block;
      let y = e; for (let i = 0; y.phase === 'enemy' && i < 20; i++) y = applyCommand(y, { type: 'ENEMY_STEP' }).state;
      return y.allies[0].hp;
    };
    expect(turn2(6)).toBe(402);
    expect(turn2(0)).toBe(400);
  });
});

describe('区切りB: 拳（手数と気）', () => {
  it('鉄掌の手甲《連打》: 同じターンの3枚目の後、フォーカス+1。1ターンに1回', () => {
    let s = battle(['warrior'], ['ironPalmWraps']);
    s.allies[0].focus = 0;
    s = use(use(s, 'strike').state, 'guard').state;
    expect(s.allies[0].focus).toBe(0);
    s = use(s, 'strike').state;
    expect(s.allies[0].focus).toBe(1);
    s = use(s, 'strike').state;
    expect(s.allies[0].focus).toBe(1);
  });
  it('堅実の手甲《受け》: 敵の攻撃を防ぎきると、次のカード1枚のコスト−1', () => {
    const s = battle(['warrior'], ['steadyWraps'], { enemies: ['stageBHitter'] });
    let e = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state;
    e.allies[0].block = 99;
    for (let i = 0; e.phase === 'enemy' && i < 20; i++) e = applyCommand(e, { type: 'ENEMY_STEP' }).state;
    expect(cardCostOf(e, e.allies[0], strike()).cost).toBe(0);
    e.allies[0].mana = 10;
    e = use(e, 'strike').state;
    expect(e.allies[0].mana).toBe(10);
    expect(cardCostOf(e, e.allies[0], strike()).cost).toBe(1);
    // 防げずにHPが減った時は付かない
    const hurt = nextTurn(battle(['warrior'], ['steadyWraps'], { enemies: ['stageBHitter'] }));
    expect(cardCostOf(hurt, hurt.allies[0], strike()).cost).toBe(1);
  });
  it('疾走の手甲《疾走》: 同じターンの4枚目からの物理カードのダメージ+4', () => {
    let s = battle(['warrior'], ['galeWraps']);
    for (let i = 0; i < 3; i++) { expect(mods(s).add ?? 0, `${i}枚`).toBe(0); s = use(s, 'guard').state; }
    expect(mods(s).add).toBe(4);
    expect(damageModifiers(s, s.allies[0], getCard('magicArrow'), s.enemies[0]).add ?? 0).toBe(0);
  });
  it('静水の手甲《気の巡り》: フォーカスを使ったカードが完全成功したら、フォーカスが1戻る。1ターンに1回', () => {
    let s = battle(['warrior'], ['stillwaterWraps']);
    s.allies[0].focus = 3;
    s = use(s, 'strike', { focus: 1 }).state;
    expect(s.allies[0].focus).toBe(3);
    s = use(s, 'strike', { focus: 1 }).state;
    expect(s.allies[0].focus).toBe(2);
  });
});

describe('区切りB: 短剣（毒と身軽さ）', () => {
  it('鍛鋼の短剣《毒刃》: 物理の攻撃カードの完全成功で毒2。1ターンに2回まで', () => {
    let s = battle(['warrior'], ['temperedDagger']);
    for (const n of [2, 4, 4]) { s = use(s, 'strike', { focus: 'max' }).state; expect(st(s.enemies[0], 'poison')).toBe(n); }
  });
  it('受け流しの短剣《軽業》: そのターン最初のコスト0のカードの後、1枚引く', () => {
    let s = battle(['warrior'], ['guardDagger']);
    s = use(s, 'strike').state;
    expect(s.allies[0].hand).toHaveLength(0);
    s = use(s, 'wQuickStab').state;
    expect(s.allies[0].hand).toHaveLength(1);
    s.allies[0].hand = [];
    s = use(s, 'wQuickStab').state;
    expect(s.allies[0].hand).toHaveLength(0);
  });
  it('蠍の針《蠍毒》: まだ毒が無い敵に毒を付ける時だけ、毒+2', () => {
    const s = battle(['warrior'], ['scorpionSting']);
    expect(statusBonusOf(s.allies[0], 'poison', strike(), s.enemies[0])).toBe(2);
    expect(statusBonusOf(s.allies[0], 'burn', strike(), s.enemies[0])).toBe(0);
    applyEffect(makeCtx(s, createRng(1), [], s.allies[0], { target: s.enemies[0], card: strike() }), { kind: 'applyStatus', status: 'poison', amount: 1, to: 'target' });
    expect(st(s.enemies[0], 'poison')).toBe(3);
    applyEffect(makeCtx(s, createRng(1), [], s.allies[0], { target: s.enemies[0], card: strike() }), { kind: 'applyStatus', status: 'poison', amount: 1, to: 'target' });
    expect(st(s.enemies[0], 'poison')).toBe(4);
  });
  it('静心の短剣《影歩き》: コスト0のカードを3枚使うと、次の攻撃カード1枚が敵のブロックを無視する', () => {
    let s = battle(['warrior'], ['calmDagger']);
    for (let i = 0; i < 2; i++) s = use(s, 'wQuickStab').state;
    expect(s.allies[0].counters?.shadowStep ?? 0).toBe(0);
    s = use(s, 'wQuickStab').state;
    expect(s.allies[0].counters?.shadowStep).toBe(1);
    s.enemies[0].block = 999;
    const hp = s.enemies[0].hp;
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(s.enemies[0].hp).toBeLessThan(hp);
    expect(s.allies[0].counters?.shadowStep).toBe(0);
    const hp2 = s.enemies[0].hp;
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(s.enemies[0].hp).toBe(hp2);
  });
  it('疫毒の短剣《猛毒の牙》: 毒が10以上の敵に、物理ダメージ ×1.3', () => {
    const s = battle(['warrior'], ['plagueDagger']), bare = battle(['warrior'], [undefined]);
    s.enemies[0].statuses.poison = 9; bare.enemies[0].statuses.poison = 9;
    expect(ratio(s, bare)).toBeCloseTo(1);
    s.enemies[0].statuses.poison = 10; bare.enemies[0].statuses.poison = 10;
    expect(ratio(s, bare)).toBeCloseTo(1.3);
  });
});

describe('区切りB: 弓（狙う）', () => {
  it('鋼の弓《崩しの矢》: 大技を予告している敵を狙う時だけ、成功率+15%', () => {
    const s = battle(['warrior'], ['steelBow'], { enemies: ['stageBBig', 'stageBIdler'] });
    expect(cardChanceBonus(s.allies[0], strike(), s.enemies[0], s)).toBe(15);
    expect(cardChanceBonus(s.allies[0], strike(), s.enemies[1], s)).toBe(0);
    expect(chanceFor(s.allies[0], strike(), s.enemies[0], s)).toBeGreaterThanOrEqual(chanceFor(s.allies[0], strike(), s.enemies[1], s));
    s.enemies[0].broken = true;
    expect(cardChanceBonus(s.allies[0], strike(), s.enemies[0], s)).toBe(0);
  });
  it('均衡の弓《二の矢》: 「×N回」の攻撃が全部HPに当たったら1枚引く。ブロックで止められた回があれば引かない', () => {
    const s = use(battle(['warrior'], ['balancedBow']), 'lnBuFlurry', { focus: 'max' }).state;
    expect(s.allies[0].hand).toHaveLength(1);
    // 最後の1回だけがHPに届く量のブロック（ほかの回はブロックで止まる）→ 引かない
    const b = battle(['warrior'], ['balancedBow']);
    b.enemies[0].block = s.enemies[0].maxHp - s.enemies[0].hp - 1;
    const rb = use(b, 'lnBuFlurry', { focus: 'max' }).state;
    expect(rb.enemies[0].hp).toBe(rb.enemies[0].maxHp - 1);
    expect(rb.allies[0].hand).toHaveLength(0);
    // 1回だけの攻撃では起きない
    expect(use(battle(['warrior'], ['balancedBow']), 'strike', { focus: 'max' }).state.allies[0].hand).toHaveLength(0);
  });
  it('吹雪の弓《吹雪》: 敵全体を狙うカードの完全成功で、敵1体に凍結1。ボス戦では代わりに弱体1', () => {
    const s = use(battle(['warrior'], ['blizzardBow'], { enemies: ['stageBIdler', 'stageBIdler'] }), 'lnBuSwipe', { focus: 'max' }).state;
    expect(s.enemies.reduce((n, e) => n + st(e, 'freeze'), 0)).toBe(1);
    const boss = use(battle(['warrior'], ['blizzardBow'], { enemies: ['stageBIdler'], boss: true }), 'lnBuSwipe', { focus: 'max' }).state;
    expect([st(boss.enemies[0], 'freeze'), st(boss.enemies[0], 'weak')]).toEqual([0, 1]);
    // 1体を狙うカードでは起きない
    const one = use(battle(['warrior'], ['blizzardBow']), 'strike', { focus: 'max' }).state;
    expect(st(one.enemies[0], 'freeze')).toBe(0);
  });
  it('剛弦の弓《剛弦》: ブロックが無い敵に、物理カードのダメージ ×1.25', () => {
    const s = battle(['warrior'], ['surestrikeBow']), bare = battle(['warrior'], [undefined]);
    expect(ratio(s, bare)).toBeCloseTo(1.25);
    s.enemies[0].block = 1; bare.enemies[0].block = 1;
    expect(ratio(s, bare)).toBeCloseTo(1);
  });
  it('天穿つ弓《天穿ち》: BREAK した敵を狙う次のカード1枚が、必ず完全成功。1ターンに1回。同じ操作なら同じ結果', () => {
    const s = battle(['warrior'], ['skyBow'], { enemies: ['stageBIdler', 'stageBIdler'] });
    const a = s.allies[0];
    expect(rollChanceFor(a, getCard('lnBuSwipe'), 0, s.enemies[0], s)).toBeLessThan(100);
    s.enemies[0].broken = true;
    expect(rollChanceFor(a, getCard('wtSpearPierce'), 0, s.enemies[0], s)).toBe(100);
    expect(rollChanceFor(a, getCard('wtSpearPierce'), 0, s.enemies[1], s)).toBeLessThan(100);
    const again = structuredClone(s);
    const r = use(s, 'wtSpearPierce');
    const roll = r.events.find((e) => e.type === 'roll');
    expect(roll && roll.type === 'roll' && [roll.perfect, roll.chance]).toEqual([true, 100]);
    expect(hasAbility(r.events, '天穿ち')).toBe(true);
    // 同じ状態から同じ操作をすれば、乱数も結果も同じ（オンライン・保存して再開でも同じ結果）
    again.allies[0].hand.push({ uid: 'again', cardId: 'wtSpearPierce' });
    const cmd: Command = { type: 'PLAY_CARD', playerId: 'P1', characterId: again.allies[0].id, cardInstanceId: 'again', targetId: again.enemies[0].uid, focusUsed: 0 };
    const r1 = applyCommand(again, cmd), r2 = applyCommand(structuredClone(again), cmd);
    expect(r1.state.rngState).toBe(r2.state.rngState);
    expect(r1.state.enemies[0].hp).toBe(r2.state.enemies[0].hp);
    expect(r1.state.enemies[0].hp).toBe(r.state.enemies[0].hp);
    // 同じターンの2枚目は、ふつうの成功率
    expect(rollChanceFor(r.state.allies[0], getCard('wtSpearPierce'), 0, r.state.enemies[0], r.state)).toBeLessThan(100);
    // 次のターンは、また使える（BREAK はターンごとに消えるので、もう一度崩した時）
    const next = nextTurn(r.state);
    next.enemies[0].broken = true;
    expect(rollChanceFor(next.allies[0], getCard('wtSpearPierce'), 0, next.enemies[0], next)).toBe(100);
  });
  it('天穿つ弓と星読み: 先読みした結果も完全成功で、確定した結果と同じ', () => {
    const s = battle(['astrologer'], ['skyBow']);
    s.enemies[0].broken = true;
    const a = s.allies[0], inst = { uid: 'sky1', cardId: 'wtSpearPierce' };
    a.hand.push(inst);
    const p = applyCommand(s, { type: 'PREVIEW_CARD', playerId: 'P1', characterId: a.id, cardInstanceId: inst.uid, targetId: s.enemies[0].uid, focusUsed: 0 });
    expect(p.error).toBeUndefined();
    expect(p.state.slotPreview!.chance).toBe(100);
    expect(p.state.slotPreview!.results.every((x) => x !== 'miss')).toBe(true);
    const c = applyCommand(p.state, { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: a.id });
    expect(c.error).toBeUndefined();
    const roll = c.events.find((e) => e.type === 'roll');
    expect(roll && roll.type === 'roll' && roll.perfect).toBe(true);
    // 予約で使った事になり、同じターンの次のカードには付かない
    expect(rollChanceFor(c.state.allies[0], getCard('wtSpearPierce'), 0, c.state.enemies[0], c.state)).toBeLessThan(100);
  });
});

describe('区切りB: 保存の版', () => {
  it('今の保存データは読める。v18 は読まない（壊れずに null。今の版は区切りCで v20。lineupStageC.test.ts）', () => {
    expect(STATE_VERSION).toBeGreaterThanOrEqual(19);
    const g = game(['warrior'], ['steelSword']);
    expect(migrateGame(structuredClone(g))).toEqual(g);
    const old = structuredClone(g) as GameState & { version: number };
    old.version = 18;
    expect(migrateGame(old)).toBeNull();
  });
});
