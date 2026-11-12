// ラインナップの作り直し 区切りC（docs/tasks/lineup-impl-plan.md）
// 残り7種類の武器 103→40。武器ごとの能力（銃 = 多段と早撃ち、鞭 = お供への号令と弱体、杖 = 弱点を突く、
// 魔導書 = 属性の使い分け、錫杖 = オーバーヒールと聖光、鎌 = 呪いの起爆、楽器 = 支援と連携）、
// お供の行動は1ターンに4回まで、保存の版 v20。
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, getItem } from '../../data/items';
import type { AbilityDef, AllyState, BattleState, Command, GameState, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, createRng, describeAbility, toPartyMember } from '../index';
import { STATE_VERSION } from '../battle/battle';
import { GAME_VERSION } from '../game/game';
import { PET_ACTS_PER_TURN, cardChanceBonus, cardCostOf, damageModifiers, statusBonusOf, summonTurnsBonus } from '../abilities';
import { applyEffect, makeCtx } from '../battle/effects';

const wait = [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block' as const, amount: 0 }] }];
const dummy = { icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence' };
ENEMIES.register({ ...dummy, id: 'stageCIdler', name: '確認用の置物', maxHp: 100000, actions: wait });
ENEMIES.register({ ...dummy, id: 'stageCTiny', name: '確認用の小さな置物', maxHp: 1, actions: wait });
ENEMIES.register({ ...dummy, id: 'stageCFireWeak', name: '確認用の火に弱い置物', maxHp: 100000, weak: ['fire'], actions: wait });

const TYPES = ['gun', 'whip', 'staff', 'tome', 'scepter', 'scythe', 'instrument'];
// ランダムダンジョンの専用の装備（段階7a・source あり）は区切りCの数に入れない（数は randomDungeon7a.test.ts で確かめる）
const weaponsC = () => ITEMS.all.filter((i) => i.slot === 'weapon' && !i.source && TYPES.includes(i.weaponType ?? ''));

type Opt = { enemies?: string[]; players?: PlayerId[]; boss?: boolean; midboss?: boolean };
function game(classes: string[], weapons: (string | undefined)[], players?: PlayerId[]): GameState {
  const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: players?.[i] ?? 'P1' })) });
  g.heroes.forEach((h, i) => { if (weapons[i]) h.equipment.weapon = { uid: `w${i}`, itemId: weapons[i]! }; else delete h.equipment.weapon; });
  return g;
}
/** 確認用の戦闘。マナとフォーカスはたっぷり、手札は空 */
function battle(classes: string[], weapons: (string | undefined)[], opt: Opt = {}): BattleState {
  const g = game(classes, weapons, opt.players);
  const s = createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'stageC', name: '確認', enemies: (opt.enemies ?? ['stageCIdler']).map((defId) => ({ defId })), ...(opt.boss ? { boss: true } : {}), ...(opt.midboss ? { midboss: true } : {}) } });
  for (const a of s.allies) { a.mana = 30; a.focus = 9; a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
let uid = 0;
/** カードを手札に足して使う。focus = 'max' なら全部の枠にフォーカス（必ず完全成功） */
function use(s: BattleState, cardId: string, o: { ally?: number; target?: number; allyTarget?: number; focus?: number | 'max'; player?: PlayerId } = {}) {
  const a = s.allies[o.ally ?? 0], inst = { uid: `c${uid++}`, cardId };
  a.hand.push(inst);
  a.mana = Math.max(a.mana, 10);
  const card = getCard(cardId), focus = o.focus === 'max' ? card.slots : o.focus ?? 0;
  if (focus) a.focus = Math.max(a.focus, focus);
  const targetId = card.target === 'enemy' ? s.enemies[o.target ?? 0].uid : card.target === 'ally' ? s.allies[o.allyTarget ?? 0].id : undefined;
  const cmd: Command = { type: 'PLAY_CARD', playerId: o.player ?? a.playerId, characterId: a.id, cardInstanceId: inst.uid, targetId, focusUsed: focus };
  const r = applyCommand(s, cmd);
  expect(r.error, cardId).toBeUndefined();
  return r;
}
/** ターン終了 → 敵の番を最後まで。出来事も返す */
function nextTurn(s: BattleState) {
  const first = applyCommand(s, { type: 'END_TURN', playerId: 'P1' });
  let st = first.state;
  const events = [...first.events];
  for (let i = 0; st.phase === 'enemy' && i < 20; i++) { const r = applyCommand(st, { type: 'ENEMY_STEP' }); st = r.state; events.push(...r.events); }
  return { state: st, events };
}
const stOf = (u: { statuses: Record<string, number | undefined> }, id: string) => u.statuses[id] ?? 0;
const strike = () => getCard('strike');
const hasAbility = (events: { type: string; name?: string }[], name: string) => events.some((e) => e.type === 'ability' && e.name === name);
const countAbility = (events: { type: string; name?: string }[], name: string) => events.filter((e) => e.type === 'ability' && e.name === name).length;
const lost = (s: BattleState, i = 0) => s.enemies[i].maxHp - s.enemies[i].hp;
/** お供と、「カードを使った後に2ダメージ」のお供の能力を持たせる */
function givePet(a: AllyState) {
  a.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴーちゃん', love: 0, acts: 0 } as never;
  const peck: AbilityDef = { name: 'つつく', description: '', pet: true, effect: { when: 'afterCard', do: [{ kind: 'damage', amount: 2, to: 'randomFoe' }] } } as AbilityDef;
  a.abilities = [...(a.abilities ?? []), peck];
}

describe('区切りC: 数', () => {
  it('7種類の武器は40本。種類ごとの数も決めたとおり。武器は全部で86本', () => {
    const n: Record<string, number> = {};
    for (const w of weaponsC()) n[w.weaponType!] = (n[w.weaponType!] ?? 0) + 1;
    expect(n).toEqual({ gun: 5, whip: 5, staff: 7, tome: 5, scepter: 8, scythe: 5, instrument: 5 });
    expect(weaponsC()).toHaveLength(40);
    expect(ITEMS.all.filter((i) => i.slot === 'weapon' && !i.source)).toHaveLength(86);
  });
  it('外した物は無い。レア度を動かした2本・名前を直した1本', () => {
    for (const id of ['breachingGun', 'plagueGun', 'balancedWhip', 'steadfastWhip', 'thunderStaff', 'circulationStaff', 'pharaohStaff', 'cursewardTome', 'fellowshipScepter', 'judgesScepter', 'soulwellScythe', 'riftscythe', 'grandLute', 'plagueLute']) expect(ITEMS.tryGet(id), id).toBeUndefined();
    expect([getItem('companionWhip').rarity, getItem('miasmaTome').rarity]).toEqual(['rare', 'rare']);
    expect(getItem('duelistsGun').name).toBe('早抜きの銃');
  });
  it('同じ中身の能力を持つ武器は無い。能力の説明文は全部作れる', () => {
    const seen = new Map<string, string>();
    for (const w of weaponsC()) {
      if (!w.ability) continue;
      const key = JSON.stringify([w.ability.effect, w.ability.also ?? []]);
      expect(seen.get(key), `${w.id} と ${seen.get(key)}`).toBeUndefined();
      seen.set(key, w.id);
      expect(describeAbility(w.ability).length, w.id).toBeGreaterThan(0);
      expect(w.description, w.id).toBeTruthy();
    }
    expect(weaponsC().filter((w) => !w.ability).map((w) => w.id).sort()).toEqual(['antiqueGun', 'apprenticeTome', 'leatherWhip', 'oakStaff', 'rustyScythe', 'travelerLute', 'woodScepter']);
  });
  it('付くカードは全部、今あるカード', () => {
    for (const w of weaponsC()) for (const c of w.cards ?? []) expect(() => getCard(c.cardId), w.id).not.toThrow();
    expect(getItem('balancedGun').cards).toEqual([{ cardId: 'wtGunFanFire', count: 2 }]);
    expect(getItem('awakeningScepter').cards).toEqual([{ cardId: 'wtScepterMiracle', count: 2 }]);
    expect(getItem('springbringerScepter').cards).toEqual([{ cardId: 'wtScepterMiracle', count: 2 }]);
  });
  it('保存の版は v20', () => {
    expect(STATE_VERSION).toBeGreaterThanOrEqual(20);
    expect(GAME_VERSION).toBeGreaterThanOrEqual(20);
  });
  it('古式銃の札は「ストライク」（区切りG-1: 単発射撃 85%・4/8 は、形が同じなのでストライクにまとめた）', () => {
    const c = getCard('strike');
    expect(getItem('antiqueGun').cards).toEqual([{ cardId: 'strike', count: 2 }]);
    expect(c.baseChance).toBe(80);
    expect(c.tiers.map((t) => (t.effects[0] as { amount: number }).amount)).toEqual([4, 7]);
  });
});

describe('区切りC: 銃', () => {
  const once = (s: BattleState) => damageModifiers(s, s.allies[0], strike(), s.enemies[0]).addOnce;
  it('精密銃《弾込め》: 残したマナ1につき、次のターン最初の物理カードの最初の1発に+4（最大+8）', () => {
    let s = battle(['warrior'], ['rifledGun']);
    expect(once(s)).toBe(0);
    s.allies[0].mana = 1;
    s = nextTurn(s).state;
    expect(once(s)).toBe(4);
    s.allies[0].mana = 5;
    s = nextTurn(s).state;
    expect(once(s)).toBe(8);
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(once(s)).toBe(0); // 2枚目からは無し
    s.allies[0].mana = 0;
    s = nextTurn(s).state;
    expect(once(s)).toBe(0); // マナを使い切ったら、弾は込められない
  });
  it('精密銃《弾込め》: ×N回のカードでも、足すのは最初の1発だけ', () => {
    const run = (weapon: string | undefined, cardId: string) => {
      let s = battle(['warrior'], [weapon]);
      s.allies[0].mana = 5;
      s = nextTurn(s).state;
      return lost(use(s, cardId, { focus: 'max' }).state);
    };
    const single = run('rifledGun', 'strike') - run(undefined, 'strike');
    const multi = run('rifledGun', 'wtGunFanFire') - run(undefined, 'wtGunFanFire');
    expect(single).toBeGreaterThan(0);
    expect(multi).toBeGreaterThan(0);
    expect(multi).toBeLessThanOrEqual(single + 1);
  });
  it('安定銃《連射》: ×N回のカードの成功率+10%（ほかのカードは変わらない）', () => {
    const s = battle(['warrior'], ['balancedGun']), bare = battle(['warrior'], [undefined]);
    const diff = (id: string) => cardChanceBonus(s.allies[0], getCard(id), s.enemies[0], s) - cardChanceBonus(bare.allies[0], getCard(id), bare.enemies[0], bare);
    expect(diff('wtGunFanFire')).toBe(10);
    expect(diff('strike')).toBe(0);
  });
  it('狙撃銃《観測射撃》: 自分の召喚が敵にダメージを与えた後、自分に応援1。1ターンに1回', () => {
    const s = battle(['warrior'], ['marksmanGun']);
    s.allies[0].summons = [{ id: 'a', name: '砲台A', icon: 'T', damage: 3, turns: 5 }, { id: 'b', name: '砲台B', icon: 'T', damage: 3, turns: 5 }];
    const r = nextTurn(s);
    expect(countAbility(r.events, '観測射撃')).toBe(1);
    expect(stOf(r.state.allies[0], 'inspired')).toBe(1);
    const none = battle(['warrior'], ['marksmanGun']);
    expect(stOf(nextTurn(none).state.allies[0], 'inspired')).toBe(0);
  });
  it('早抜きの銃《早撃ち》: 1ターン目だけ、物理カードのコスト−1', () => {
    let s = battle(['warrior'], ['duelistsGun']);
    const base = strike().cost;
    expect(cardCostOf(s, s.allies[0], strike()).cost).toBe(Math.max(0, base - 1));
    expect(cardCostOf(s, s.allies[0], getCard('fireball')).cost).toBe(getCard('fireball').cost);
    s = nextTurn(s).state;
    expect(cardCostOf(s, s.allies[0], strike()).cost).toBe(base);
  });
});

describe('区切りC: 鞭とお供', () => {
  it('鋼芯の鞭《しつけ》: 物理カードが完全成功で弱体1。1ターンに1回', () => {
    let s = battle(['warrior'], ['temperedWhip']);
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(stOf(s.enemies[0], 'weak')).toBe(1);
    s = use(s, 'strike', { focus: 'max' }).state;
    expect(stOf(s.enemies[0], 'weak')).toBe(1);
  });
  it('相棒の鞭《号令》: 物理カードが完全成功した後、お供が1回行動する。お供がいなければ何も起きない', () => {
    const s = battle(['warrior'], ['companionWhip']);
    givePet(s.allies[0]);
    const r = use(s, 'strike', { focus: 'max' });
    expect(hasAbility(r.events, '号令')).toBe(true);
    // カードの後の「つつく」1回 + 号令の1回
    expect(r.state.allies[0].counters?.petActsTurn).toBe(2);
    const bare = battle(['warrior'], ['companionWhip']);
    expect(hasAbility(use(bare, 'strike', { focus: 'max' }).events, '号令')).toBe(false);
  });
  it('お供の行動は、全部合わせて1ターンに4回まで。次のターンにまた動ける', () => {
    expect(PET_ACTS_PER_TURN).toBe(4);
    let s = battle(['warrior'], ['companionWhip']);
    givePet(s.allies[0]);
    let acts = 0;
    for (let i = 0; i < 6; i++) { const r = use(s, 'strike', { focus: 'max' }); s = r.state; acts += countAbility(r.events, 'つつく'); }
    expect(s.allies[0].counters?.petActsTurn).toBe(4);
    expect(acts).toBeLessThanOrEqual(4);
    s = nextTurn(s).state;
    expect(s.allies[0].counters?.petActsTurn).toBe(0);
    s = use(s, 'strike').state;
    expect(s.allies[0].counters?.petActsTurn).toBeGreaterThanOrEqual(1);
  });
  it('傷裂きの鞭《追い込み》: 弱体の敵への、お供・召喚の攻撃+3（カードの攻撃には付かない）', () => {
    const s = battle(['warrior'], ['rendingWhip']);
    const add = (via?: 'pet' | 'summon') => damageModifiers(s, s.allies[0], undefined, s.enemies[0], undefined, undefined, undefined, via).add;
    expect(add('summon')).toBe(0);
    s.enemies[0].statuses.weak = 2;
    expect(add('summon')).toBe(3);
    expect(add('pet')).toBe(3);
    expect(add()).toBe(0);
    expect(damageModifiers(s, s.allies[0], strike(), s.enemies[0]).add).toBe(0);
  });
  it('傷裂きの鞭《追い込み》: 実際の召喚の攻撃が3増える', () => {
    const run = (weapon: string | undefined) => {
      const s = battle(['warrior'], [weapon]);
      s.enemies[0].statuses.weak = 5;
      s.allies[0].summons = [{ id: 'a', name: '砲台A', icon: 'T', damage: 3, turns: 5 }];
      return lost(nextTurn(s).state);
    };
    expect(run('rendingWhip') - run(undefined)).toBeGreaterThanOrEqual(3);
  });
  it('獣絆の鞭《獣との絆》: お供が行動したターンの間、物理カードのダメージ×1.25', () => {
    const s = battle(['warrior'], ['beastbondWhip']);
    const mul = () => damageModifiers(s, s.allies[0], strike(), s.enemies[0]).multiplier;
    const before = mul();
    (s.allies[0].counters ??= {}).petActsTurn = 1;
    expect(mul() / before).toBeCloseTo(1.25);
  });
});

describe('区切りC: 杖と魔導書', () => {
  it('魔導士の杖《弱点突き》: 魔法カードが弱点を突いた時、追加で4ダメージ。1ターンに1回', () => {
    let s = battle(['mage'], ['magusStaff'], { enemies: ['stageCFireWeak'] });
    const r1 = use(s, 'fireball', { focus: 'max' });
    expect(hasAbility(r1.events, '弱点突き')).toBe(true);
    const r2 = use(r1.state, 'fireball', { focus: 'max' });
    expect(hasAbility(r2.events, '弱点突き')).toBe(false);
    s = battle(['mage'], ['magusStaff'], { enemies: ['stageCFireWeak'] });
    expect(hasAbility(use(s, 'iceLance', { focus: 'max' }).events, '弱点突き')).toBe(false);
    const plain = battle(['mage'], ['magusStaff']);
    expect(hasAbility(use(plain, 'fireball', { focus: 'max' }).events, '弱点突き')).toBe(false);
  });
  it('魔導士の杖《弱点突き》: 追加のダメージの分だけ、敵のHPが多く減る', () => {
    const run = (weapon: string) => lost(use(battle(['mage'], [weapon], { enemies: ['stageCFireWeak'] }), 'fireball', { focus: 'max' }).state);
    expect(run('magusStaff') - run('oakStaff')).toBeGreaterThanOrEqual(4);
  });
  it('調律の杖《詠唱》: そのターン最初の魔法カードがコスト2以上なら、成功率+10%', () => {
    const s = battle(['mage'], ['balancedStaff']), bare = battle(['mage'], ['oakStaff']);
    const diff = (x: BattleState, id: string) => cardChanceBonus(x.allies[0], getCard(id), x.enemies[0], x) - cardChanceBonus(bare.allies[0], getCard(id), bare.enemies[0], bare);
    expect(diff(s, 'fireball')).toBe(10);
    expect(diff(s, 'iceLance')).toBe(0);
    const after = use(s, 'iceLance').state;
    expect(diff(after, 'fireball')).toBe(0);
  });
  it('星詠みの杖《星詠み》: 弱点を突く魔法カードの成功率+15%', () => {
    const s = battle(['mage'], ['starStaff'], { enemies: ['stageCFireWeak', 'stageCIdler'] }), bare = battle(['mage'], ['oakStaff'], { enemies: ['stageCFireWeak', 'stageCIdler'] });
    const diff = (id: string, target: number) => cardChanceBonus(s.allies[0], getCard(id), s.enemies[target], s) - cardChanceBonus(bare.allies[0], getCard(id), bare.enemies[target], bare);
    expect(diff('fireball', 0)).toBe(15);
    expect(diff('fireball', 1)).toBe(0);
    expect(diff('iceLance', 0)).toBe(0);
  });
  it('賢学の魔導書《書き分け》: 前に使った属性カードと違う属性の魔法カードの成功率+10%', () => {
    const s = battle(['mage'], ['scholarsTome']), bare = battle(['mage'], ['apprenticeTome']);
    const diff = (x: BattleState, id: string) => cardChanceBonus(x.allies[0], getCard(id), x.enemies[0], x) - cardChanceBonus(bare.allies[0], getCard(id), bare.enemies[0], bare);
    expect(diff(s, 'fireball')).toBe(0); // 最初の1枚は、比べる物が無い
    const after = use(s, 'fireball').state;
    expect(diff(after, 'iceLance')).toBe(10);
    expect(diff(after, 'fireball')).toBe(0);
    const again = use(use(after, 'strike').state, 'iceLance').state; // 属性の無いカードは数えない
    expect(diff(again, 'fireball')).toBe(10);
    expect(diff(again, 'iceLance')).toBe(0);
  });
  it('瘴気の魔導書《種まき》: 悪い状態異常が無い敵に、魔法カードで付ける状態異常+1。1ターンに1回', () => {
    const s = battle(['mage'], ['miasmaTome']);
    const magic = getCard('fireball');
    expect(statusBonusOf(s.allies[0], 'poison', strike(), s.enemies[0], s)).toBe(0); // 物理カードには付かない
    expect(statusBonusOf(s.allies[0], 'poison', magic, s.enemies[0], s)).toBe(1);
    expect(statusBonusOf(s.allies[0], 'poison', magic, s.enemies[0], s)).toBe(0); // 同じターンの2回目
    const dirty = battle(['mage'], ['miasmaTome']);
    dirty.enemies[0].statuses.weak = 1;
    expect(statusBonusOf(dirty.allies[0], 'poison', magic, dirty.enemies[0], dirty)).toBe(0);
  });
  it('瘴気の魔導書《種まき》: 実際のカードで、火傷が1多く付く（属性ダメージに付いてくる火傷にも乗る。1ターンに1回）', () => {
    const burn = (weapon: string) => stOf(use(battle(['mage'], [weapon]), 'fireball', { focus: 'max' }).state.enemies[0], 'burn');
    expect(burn('miasmaTome') - burn('apprenticeTome')).toBe(1);
  });
  it('深思の魔導書《契約の書》: 召喚が一緒に戦うターン+1', () => {
    expect(summonTurnsBonus(battle(['mage'], ['deepthoughtTome']).allies[0]) - summonTurnsBonus(battle(['mage'], ['apprenticeTome']).allies[0])).toBe(1);
  });
  it('極光の魔導書《四元》: 同じターンに違う属性を3種類使うと、マナ+1・1枚引く。1ターンに1回', () => {
    let s = battle(['mage'], ['auroraTome']);
    let r = use(s, 'fireball'); s = r.state;
    expect(hasAbility(r.events, '四元')).toBe(false);
    r = use(s, 'fireball'); s = r.state; // 同じ属性は増えない
    r = use(s, 'iceLance'); s = r.state;
    expect(hasAbility(r.events, '四元')).toBe(false);
    r = use(s, 'thunder'); s = r.state;
    expect(hasAbility(r.events, '四元')).toBe(true);
    r = use(s, 'iceLance'); s = r.state;
    expect(hasAbility(r.events, '四元')).toBe(false);
    // 次のターンは数え直し
    s = nextTurn(s).state;
    r = use(s, 'fireball');
    expect(hasAbility(r.events, '四元')).toBe(false);
  });
});

describe('区切りC: 錫杖', () => {
  const heal = (s: BattleState, to: number) => { const ev: { type: string; name?: string }[] = []; applyEffect(makeCtx(s, createRng(1), ev as never, s.allies[0], { allyTarget: s.allies[to] }), { kind: 'heal', amount: 5, to: 'allyTarget' }); return ev; };
  it('朝光の錫杖《朝の祈り》: HPが満タンの味方を回復した時、その味方にブロック3。1ターンに1回', () => {
    const s = battle(['warrior', 'mage'], ['dawnScepter', undefined]);
    expect(hasAbility(heal(s, 1), '朝の祈り')).toBe(true);
    expect(s.allies[1].block).toBe(3);
    heal(s, 1);
    expect(s.allies[1].block).toBe(3);
  });
  it('朝光の錫杖《朝の祈り》: HPが減っている味方を回復した時は、起きない（あふれても）', () => {
    const s = battle(['priest', 'warrior'], ['dawnScepter', undefined]);
    s.allies[1].hp = s.allies[1].maxHp - 2;
    expect(hasAbility(heal(s, 1), '朝の祈り')).toBe(false);
    expect(s.allies[1].block).toBe(0);
    expect(s.allies[1].hp).toBe(s.allies[1].maxHp);
  });
  it('春告げの錫杖《雪解けの光》: ターン開始時、味方全員の悪い状態異常を1つ（一番多い物）治す', () => {
    const s = battle(['priest', 'warrior'], ['springbringerScepter', undefined]);
    s.allies[1].statuses.vulnerable = 9;
    s.allies[1].statuses.weak = 6;
    const r = nextTurn(s);
    expect(hasAbility(r.events, '雪解けの光')).toBe(true);
    expect(stOf(r.state.allies[1], 'vulnerable')).toBe(0);
    expect(stOf(r.state.allies[1], 'weak')).toBeGreaterThan(0);
  });
  it('悪い状態異常を1つ治す効果は、良い状態異常に触らない', () => {
    const s = battle(['priest'], [undefined]);
    s.allies[0].statuses = { inspired: 2, weak: 1 };
    applyEffect(makeCtx(s, createRng(1), [], s.allies[0]), { kind: 'cleanseOne', to: 'self' });
    expect(s.allies[0].statuses.inspired).toBe(2);
    expect(stOf(s.allies[0], 'weak')).toBe(0);
  });
});

describe('区切りC: 鎌', () => {
  it('鍛鋼の大鎌《呪い刈り》: 呪いを起爆して消した時、消した数だけHP回復（最大6）', () => {
    const run = (curse: number) => {
      const s = battle(['warrior'], ['temperedScythe']);
      s.allies[0].hp = 100;
      s.enemies[0].statuses.curse = curse;
      applyEffect(makeCtx(s, createRng(1), [], s.allies[0], { target: s.enemies[0] }), { kind: 'detonateStatus', status: 'curse' });
      expect(stOf(s.enemies[0], 'curse')).toBe(0);
      return s.allies[0].hp - 100;
    };
    expect(run(4)).toBe(4);
    expect(run(9)).toBe(6);
    expect(run(0)).toBe(0);
  });
  it('夕闇の大鎌《屍の手》: 敵を倒した時、ランダムな敵1体に呪い2', () => {
    const s = battle(['warrior'], ['duskScythe'], { enemies: ['stageCTiny', 'stageCIdler'] });
    const r = use(s, 'strike', { focus: 'max' });
    expect(hasAbility(r.events, '屍の手')).toBe(true);
    expect(stOf(r.state.enemies[1], 'curse')).toBe(2);
  });
  it('宵闇の大鎌《呪い移し》: 敵1体への攻撃カードが完全成功した時、自分の呪いを全部移す', () => {
    const s = battle(['warrior'], ['nightfallScythe']);
    s.allies[0].statuses.curse = 3;
    const r = use(s, 'strike', { focus: 'max' });
    expect(hasAbility(r.events, '呪い移し')).toBe(true);
    expect(stOf(r.state.allies[0], 'curse')).toBe(0);
    expect(stOf(r.state.enemies[0], 'curse')).toBe(3);
    // 呪いが無ければ起きない
    expect(hasAbility(use(battle(['warrior'], ['nightfallScythe']), 'strike', { focus: 'max' }).events, '呪い移し')).toBe(false);
  });
  it('運命の大鎌《死の刻》: HP25%以下の敵に完全成功で追加ダメージ。ボス・中ボスとの戦闘では10%以下', () => {
    const fired = (pct: number, opt: Opt = {}) => {
      const s = battle(['warrior'], ['fatefulScythe'], opt);
      s.enemies[0].hp = Math.floor((s.enemies[0].maxHp * pct) / 100);
      return hasAbility(use(s, 'strike', { focus: 'max' }).events, '死の刻');
    };
    expect(fired(20)).toBe(true);
    expect(fired(60)).toBe(false);
    expect(fired(20, { boss: true })).toBe(false);
    expect(fired(20, { midboss: true })).toBe(false);
    expect(fired(9, { boss: true })).toBe(true);
  });
});

describe('区切りC: 楽器', () => {
  it('響きのリュート《伴奏》: 支援が成立した味方に応援1。1ターンに1回', () => {
    let s = battle(['priest', 'warrior'], ['resonantLute', undefined]);
    let r = use(s, 'wEncouragingNote', { focus: 'max' }); s = r.state;
    expect(hasAbility(r.events, '伴奏')).toBe(true);
    expect(stOf(s.allies[1], 'inspired')).toBe(1);
    expect(stOf(s.allies[0], 'inspired')).toBe(0);
    r = use(s, 'wEncouragingNote', { focus: 'max' }); s = r.state;
    expect(stOf(s.allies[1], 'inspired')).toBe(1);
  });
  it('響きのリュート《伴奏》: 1人の時は、自分への支援でも成立', () => {
    const r = use(battle(['priest'], ['resonantLute']), 'wEncouragingNote', { focus: 'max' });
    expect(hasAbility(r.events, '伴奏')).toBe(true);
    expect(stOf(r.state.allies[0], 'inspired')).toBe(1);
  });
  it('攻撃カードは支援にならない', () => {
    expect(hasAbility(use(battle(['priest'], ['resonantLute']), 'strike', { focus: 'max' }).events, '伴奏')).toBe(false);
  });
  it('堅心のリュート《間奏》: 攻撃カードを使わなかったターンの終わりに、味方全員にブロック3', () => {
    const quiet = battle(['priest', 'warrior'], ['steadfastLute', undefined]);
    const r = applyCommand(use(quiet, 'wEncouragingNote').state, { type: 'END_TURN', playerId: 'P1' });
    expect(hasAbility(r.events, '間奏')).toBe(true);
    const loud = battle(['priest', 'warrior'], ['steadfastLute', undefined]);
    expect(hasAbility(applyCommand(use(loud, 'strike').state, { type: 'END_TURN', playerId: 'P1' }).events, '間奏')).toBe(false);
    // 攻撃したのは前のターン → 次のターンは成立
    const later = nextTurn(use(battle(['priest', 'warrior'], ['steadfastLute', undefined]), 'strike').state).state;
    expect(hasAbility(applyCommand(later, { type: 'END_TURN', playerId: 'P1' }).events, '間奏')).toBe(true);
  });
  it('湧泉のリュート《輪唱》: 自分が応援を付けた味方のカードが完全成功したら、自分が1枚引く', () => {
    const s = battle(['priest', 'warrior'], ['wellspringLute', undefined]);
    applyEffect(makeCtx(s, createRng(1), [], s.allies[0], { allyTarget: s.allies[1] }), { kind: 'applyStatus', status: 'inspired', amount: 1, to: 'allyTarget' });
    expect(s.allies[1].cheeredBy).toBe(s.allies[0].id);
    const hand = s.allies[0].hand.length;
    const r = use(s, 'strike', { ally: 1, focus: 'max' });
    expect(hasAbility(r.events, '輪唱')).toBe(true);
    expect(r.state.allies[0].hand.length).toBe(hand + 1);
    expect(r.state.allies[1].cheeredBy).toBeUndefined();
    // 応援を使い切った後は起きない
    expect(hasAbility(use(r.state, 'strike', { ally: 1, focus: 'max' }).events, '輪唱')).toBe(false);
  });
  it('湧泉のリュート《輪唱》: 完全成功でなければ起きない。自分への応援は、1人の時だけ数える', () => {
    const cheerSelf = (classes: string[]) => {
      const s = battle(classes, ['wellspringLute']);
      applyEffect(makeCtx(s, createRng(1), [], s.allies[0]), { kind: 'applyStatus', status: 'inspired', amount: 1, to: 'self' });
      return hasAbility(use(s, 'strike', { focus: 'max' }).events, '輪唱');
    };
    expect(cheerSelf(['priest'])).toBe(true);
    expect(cheerSelf(['priest', 'warrior'])).toBe(false);
  });
  it('絆のリュート《助け合いの調べ》: 味方への支援で成立。1人の時は自分への支援でも成立', () => {
    expect(hasAbility(use(battle(['priest', 'warrior'], ['fellowshipLute', undefined]), 'wEncouragingNote', { focus: 'max' }).events, '助け合いの調べ')).toBe(true);
    expect(hasAbility(use(battle(['priest'], ['fellowshipLute']), 'wEncouragingNote', { focus: 'max' }).events, '助け合いの調べ')).toBe(true);
    expect(hasAbility(use(battle(['priest'], ['fellowshipLute']), 'strike', { focus: 'max' }).events, '助け合いの調べ')).toBe(false);
  });
});

describe('区切りC: 協力プレイと乱数', () => {
  it('協力プレイ: P2 のキャラの武器の能力も、P2 の操作で働く', () => {
    const s = battle(['mage', 'warrior'], [undefined, 'temperedWhip'], { players: ['P1', 'P2'] });
    const r = use(s, 'strike', { ally: 1, focus: 'max', player: 'P2' });
    expect(hasAbility(r.events, 'しつけ')).toBe(true);
    expect(stOf(r.state.enemies[0], 'weak')).toBe(1);
  });
  it('協力プレイ: P2 の楽器の支援が、P1 のキャラに届く', () => {
    const s = battle(['warrior', 'priest'], [undefined, 'resonantLute'], { players: ['P1', 'P2'] });
    const r = use(s, 'wEncouragingNote', { ally: 1, focus: 'max', player: 'P2' });
    expect(stOf(r.state.allies[0], 'inspired')).toBe(1);
  });
  it('同じ操作なら、同じ結果（乱数の使い方が変わらない）', () => {
    const run = () => {
      let s = battle(['mage', 'warrior'], ['auroraTome', 'duskScythe'], { enemies: ['stageCTiny', 'stageCFireWeak', 'stageCIdler'] });
      givePet(s.allies[1]);
      for (const [id, ally] of [['fireball', 0], ['strike', 1], ['iceLance', 0], ['thunder', 0], ['strike', 1]] as const) s = use(s, id, { ally, target: 1 }).state;
      s = nextTurn(s).state;
      return JSON.stringify({ e: s.enemies.map((e) => [e.hp, e.statuses]), a: s.allies.map((a) => [a.hp, a.mana, a.hand.length, a.statuses, a.counters]), rng: s.rngState });
    };
    expect(run()).toBe(run());
  });
});
