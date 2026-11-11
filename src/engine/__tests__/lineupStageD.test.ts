// ラインナップの作り直し 区切りD（docs/tasks/lineup-stageD-plan.md）
// D-1: 1枚を複数の場所に置く・同じ中身のカード36組をまとめる・例外の2組・HPを払うカードの整理・保存 v21
import { describe, expect, it } from 'vitest';
import { CARDS, cardLineages, cardWeaponTypes, getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ITEMS } from '../../data/items';
import { battleDeck } from '../game/hero';
import { ENEMIES } from '../../data/enemies';
import type { BattleState, CardDef, Command, GameState, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, toPartyMember } from '../index';
import { STATE_VERSION } from '../battle/battle';
import { heroCardPool, heroJobCardPool } from '../game/jobs';
import { cardTraitAbilities, damageModifiers } from '../abilities';
import { applyEffect, comboMultiplier, comboStage, makeCtx } from '../battle/effects';
import { createRng } from '../rng';

const wait = [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block' as const, amount: 0 }] }];
const hit = [{ id: 'hit', name: '殴る', effects: [{ kind: 'damage' as const, amount: 5 }] }];
const dummy = { icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence' };
ENEMIES.register({ ...dummy, id: 'stageDIdler', name: '確認用の置物', maxHp: 100000, actions: wait });
ENEMIES.register({ ...dummy, id: 'stageDHitter', name: '確認用の殴る置物', maxHp: 100000, actions: hit });

function game(classes: string[], players?: PlayerId[]): GameState {
  return createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: players?.[i] ?? 'P1' })) });
}
function battle(classes: string[], enemies = ['stageDIdler'], players?: PlayerId[]): BattleState {
  const g = game(classes, players);
  const s = createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'stageD', name: '確認', enemies: enemies.map((defId) => ({ defId })) } });
  for (const a of s.allies) { a.mana = 30; a.focus = 9; a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
let uid = 0;
function use(s: BattleState, cardId: string, o: { ally?: number; focus?: number | 'max'; player?: PlayerId } = {}) {
  const a = s.allies[o.ally ?? 0], inst = { uid: `d${uid++}`, cardId };
  a.hand.push(inst);
  a.mana = Math.max(a.mana, 10);
  const card = getCard(cardId), focus = o.focus === 'max' ? card.slots : o.focus ?? 0;
  if (focus) a.focus = Math.max(a.focus, focus);
  const targetId = card.target === 'enemy' ? s.enemies[0].uid : card.target === 'ally' ? s.allies[0].id : undefined;
  const cmd: Command = { type: 'PLAY_CARD', playerId: o.player ?? a.playerId, characterId: a.id, cardInstanceId: inst.uid, targetId, focusUsed: focus };
  const r = applyCommand(s, cmd);
  expect(r.error, cardId).toBeUndefined();
  return r;
}
function nextTurn(s: BattleState) {
  const first = applyCommand(s, { type: 'END_TURN', playerId: 'P1' });
  let st = first.state;
  const events = [...first.events];
  for (let i = 0; st.phase === 'enemy' && i < 20; i++) { const r = applyCommand(st, { type: 'ENEMY_STEP' }); st = r.state; events.push(...r.events); }
  return { state: st, events };
}

/** カードの中身（名前・id・置き場所・判定の能力値・出やすさの印を除く） */
const body = (c: CardDef) => JSON.stringify([c.category, c.cost, c.slots, c.baseChance, c.target, c.secondaryTarget ?? null, c.tiers, c.rarity ?? 'common', c.trait ?? null, c.exhaust ?? false, c.heresy ?? false]);

describe('区切りD-1: 同じ中身のカードをまとめる', () => {
  it('中身が同じカードは1組も無い', () => {
    const seen = new Map<string, string>();
    const dup: string[] = [];
    for (const c of CARDS.all) {
      const k = body(c);
      if (seen.has(k)) dup.push(`${seen.get(k)}＝${c.name}`);
      else seen.set(k, c.name);
    }
    expect(dup).toEqual([]);
  });
  it('まとめて消したカードは無い', () => {
    for (const id of ['risingKick', 'smokeStep', 'lnGiStab', 'jab2', 'wtDaggerBackhand', 'wtFistBreath', 'cmFlurryAll', 'wtScytheArc', 'lnBuPride', 'lnMaStudy', 'cmTeamwork', 'lnBuRally', 'lnSeiGroupBless', 'wtScepterBlessing', 'bardWard', 'maidenFocus', 'starFocus', 'gambleFocus', 'timeArrow', 'starWard', 'machineGuard', 'bladeBarrier', 'timeShield', 'graveGuard', 'starPages', 'timeCollapse', 'samuraiDrawCut', 'bladeStrike', 'wtScytheReap', 'lnSeiWall', 'wtHammerGuard', 'wtSpearWall', 'wtStaffSpark', 'lnMaBarrier', 'wtAxeParry', 'lnMaFreezeField', 'wtScepterLight', 'lnSeiShelter', 'lnSeiSanctuary', 'wtBowQuick', 'wtFistStraight', 'wtWhipLash', 'beckon', 'breathControl', 'thiefFortune', 'phantomGift', 'wtSpearThrust', 'wtSwordSwallow', 'wtKatanaFlow', 'wtKatanaPoise', 'wtSwordWhirl', 'wtGunScatter', 'wtKatanaMoon', 'wtAxeChop', 'wtGunCover', 'darkTribute']) {
      expect(CARDS.tryGet(id), id).toBeUndefined();
    }
  });
  it('どのジョブ・どの武器のカードも、全部ある（消したカードを指していない）', () => {
    for (const j of CLASSES.all) for (const id of [...j.cardPool, ...(j.signature ?? [])]) expect(CARDS.tryGet(id), `${j.id}: ${id}`).toBeDefined();
  });
  it('まとめたカードは、元の全部の場所に置かれる', () => {
    const cm = getCard('cmProbe');
    expect(cm.common).toBe(true);
    expect(cardWeaponTypes(cm)).toEqual(['dagger']);
    expect(cardLineages(cm)).toEqual(['gi']);
    expect(CLASSES.get('brawler').cardPool).toContain('cmProbe');
    const iron = getCard('lnBuIronBreath');
    expect(cardLineages(iron).sort()).toEqual(['bu', 'sei']);
    expect(cardWeaponTypes(iron).sort()).toEqual(['hammer', 'spear']);
    // 名前を変えた2枚
    expect(getCard('wtSwordLunge').name).toBe('踏み込み');
    expect(getCard('wtSwordGuard').name).toBe('構え直し');
    expect(cardWeaponTypes(getCard('wtSwordGuard'))).toEqual(['sword', 'katana']);
  });
  it('槍を持てるジョブの候補に、剣の「踏み込み」が入る（武器種を複数持つカード）', () => {
    const g = game(['lancer']);
    const h = g.heroes[0];
    expect(heroCardPool(h)).toContain('wtSwordLunge');
    h.equipment.weapon = { uid: 'w', itemId: 'ironSpear' };
    expect(heroJobCardPool(h)).toContain('wtSwordLunge');
  });
  it('判定の能力値は、まとめた組で多い方（小手調べ = 器用・堅実な構え = 知力）', () => {
    expect(getCard('cmProbe').stat).toBe('dex');
    expect(getCard('gambleGuard').stat).toBe('int');
  });
});

describe('区切りD-1: 例外の2組', () => {
  it('手斧投げ: 成功1で脆弱1（早業とは別の中身）', () => {
    const r = use(battle(['warrior']), 'wtAxeThrow', { focus: 'max' });
    expect(r.state.enemies[0].statuses.vulnerable).toBe(1);
    const q = use(battle(['warrior']), 'wQuickStab', { focus: 'max' });
    expect(q.state.enemies[0].statuses.vulnerable ?? 0).toBe(0);
  });
  it('二連射: 砲台がいれば、砲台もすぐに1回撃つ（燕返しは撃たない）', () => {
    const s = battle(['machinist']);
    expect(s.allies[0].summons?.some((x) => x.id === 'turret')).toBe(true);
    const before = s.enemies[0].hp;
    const r = use(s, 'machineVolley', { focus: 'max' });
    expect(r.state.allies[0].summons?.find((x) => x.id === 'turret')?.turns, '残りターンは減らない').toBe(s.allies[0].summons!.find((x) => x.id === 'turret')!.turns);
    expect(r.state.log.some((l) => l.text.includes('砲台が') && l.text.includes('号令'))).toBe(true);
    const s2 = battle(['machinist']);
    const r2 = use(s2, 'samuraiSwallow', { focus: 'max' });
    expect(r2.state.log.some((l) => l.text.includes('号令'))).toBe(false);
    expect(before - r.state.enemies[0].hp).toBeGreaterThan(s2.enemies[0].hp - r2.state.enemies[0].hp);
  });
});

describe('区切りD-1: HPを払うカード', () => {
  it('命の供物は、暗黒騎士と冥王の両方の候補にある（闇への供物はまとめた）', () => {
    expect(CLASSES.get('darkKnight').cardPool).toContain('bloodOffering');
    expect(CLASSES.get('hadesLord').cardPool).toContain('bloodOffering');
  });
  it('捨て身の覚醒: 今のHPの半分を払い、この戦闘の間ずっと攻撃カード×1.3・毎ターン1枚多く引く', () => {
    const s = battle(['warrior']);
    s.allies[0].hp = 300;
    const card = getCard('strike');
    const base = damageModifiers(s, s.allies[0], card, s.enemies[0]).multiplier;
    const r = use(s, 'heresyAwakening', { focus: 'max' });
    const a = r.state.allies[0];
    expect(a.hp).toBe(150);
    expect(damageModifiers(r.state, a, card, r.state.enemies[0]).multiplier).toBeCloseTo(base * 1.3);
    // 攻撃ではないカード・召喚には乗らない
    expect(damageModifiers(r.state, a, undefined, r.state.enemies[0]).multiplier).toBeCloseTo(base);
    const handBefore = nextTurn(battle(['warrior'])).state.allies[0].hand.length;
    expect(nextTurn(r.state).state.allies[0].hand.length).toBe(handBefore + 1);
    // 2回目は重ならない（1戦闘1回のカードでもある）
    expect(getCard('heresyAwakening').exhaust).toBe(true);
  });
  it('血染めの盾: HP6を払ってブロック14/20。ブロックが残っている間に殴られたら、攻撃者に8', () => {
    const s = battle(['warrior'], ['stageDHitter']);
    const r = use(s, 'heresyBloodShield', { focus: 'max' });
    expect(r.state.allies[0].hp).toBe(494);
    expect(r.state.allies[0].block).toBe(20);
    const after = nextTurn(r.state).state;
    expect(r.state.enemies[0].hp - after.enemies[0].hp).toBe(8);
  });
});

describe('区切りD-1: 保存', () => {
  it('保存の版は v21 以上', () => {
    expect(STATE_VERSION).toBeGreaterThanOrEqual(21);
  });
});

// ===================== 区切りD-2: 軸①〜③ =====================
ENEMIES.register({ ...dummy, id: 'stageDBig', name: '確認用の大技の置物', maxHp: 100000, actions: [{ id: 'big', name: '大技', big: true, effects: [{ kind: 'damage', amount: 30 }] }] });
ENEMIES.register({ ...dummy, id: 'stageDHitter20', name: '確認用の強く殴る置物', maxHp: 100000, actions: [{ id: 'hit', name: '殴る', effects: [{ kind: 'damage', amount: 20 }] }] });
ENEMIES.register({ ...dummy, id: 'stageDFireWeak', name: '確認用の火に弱い置物', maxHp: 100000, weak: ['fire'], actions: wait });
const lostHp = (before: BattleState, after: BattleState, i = 0) => before.enemies[i].hp - after.enemies[i].hp;

describe('区切りD-2: 軸① ブロック変換・反撃', () => {
  it('シールドスラム: 今のブロックの150%（先にブロック4）。上限60。ブロックは減らない', () => {
    const s = battle(['guardian']);
    s.allies[0].block = 40;
    const r = use(s, 'axShieldSlam', { focus: 'max' });
    expect(r.state.allies[0].block).toBe(44);
    expect(lostHp(s, r.state)).toBeGreaterThan(0);
    const none = battle(['guardian']);
    expect(lostHp(none, use(none, 'axShieldSlam', { focus: 'max' }).state)).toBeLessThan(lostHp(s, r.state));
  });
  it('ブロックの上限は99。次のターンに残せるのは25まで（不落の城塞のターンだけ50）', () => {
    const s = battle(['guardian']);
    s.allies[0].block = 95;
    const r = use(s, 'axSpikeArmor', { focus: 'max' });
    expect(r.state.allies[0].block).toBe(99);
    const k = battle(['guardian']);
    k.allies[0].abilities = [...(k.allies[0].abilities ?? []), { name: '確認用の錨', effect: { modifier: 'keepBlock', max: 80 } }];
    k.allies[0].block = 80;
    expect(nextTurn(k).state.allies[0].block).toBe(25);
    const f = battle(['guardian']);
    const r2 = use(f, 'axFortress', { focus: 'max' });
    r2.state.allies[0].block = 80;
    const t2 = nextTurn(r2.state).state;
    expect(t2.allies[0].block).toBe(50);
    // 次の次のターンは、もう残らない（城塞は1ターンだけ）
    expect(nextTurn(t2).state.allies[0].block).toBe(0);
  });
  it('スパイクアーマー: この敵の番に殴られたら（防いでも）攻撃者に8。次のターンには消える', () => {
    const s = battle(['warrior'], ['stageDHitter']);
    const r = use(s, 'axSpikeArmor', { focus: 'max' });
    const after = nextTurn(r.state).state;
    expect(lostHp(r.state, after)).toBe(8);
    expect(after.allies[0].abilities?.some((a) => a.name === 'スパイクアーマー') ?? false).toBe(false);
  });
  it('パリィ・カウンター: 攻撃を予告している敵に、その予告の値のダメージ（最大25）', () => {
    const s = battle(['swordmaster'], ['stageDHitter20']);
    const r = use(s, 'axParry', { focus: 'max' });
    expect(r.state.allies[0].block).toBe(10);
    expect(lostHp(s, r.state)).toBeGreaterThan(0);
    const idle = battle(['swordmaster']);
    expect(lostHp(idle, use(idle, 'axParry', { focus: 'max' }).state)).toBe(0);
  });
  it('返しの一手: 前の敵の番にHPが減らなかったら×1.5', () => {
    const s = battle(['warrior']);
    const first = lostHp(s, use(s, 'axReturnStroke', { focus: 'max' }).state);
    const calm = nextTurn(battle(['warrior'])).state;
    const second = lostHp(calm, use(calm, 'axReturnStroke', { focus: 'max' }).state);
    expect(second).toBeGreaterThan(first);
  });
  it('ブロック砕き: 敵のブロックを最大8壊し、半分を自分のブロックに', () => {
    const s = battle(['warrior']);
    s.enemies[0].block = 10;
    const r = use(s, 'axBlockBreaker', { focus: 'max' });
    expect(r.state.allies[0].block).toBe(4);
    expect(r.state.enemies[0].block).toBe(0);
  });
  it('鉄壁の進軍: 敵全員に、ブロックの70%（最大24）。ブロックは減らない（完全成功でブロック5）', () => {
    const s = battle(['guardian'], ['stageDIdler', 'stageDIdler']);
    s.allies[0].block = 30;
    const r = use(s, 'axIronMarch', { focus: 'max' });
    expect(lostHp(s, r.state, 0)).toBeGreaterThan(0);
    expect(lostHp(s, r.state, 1)).toBeGreaterThan(0);
    expect(r.state.allies[0].block).toBe(35);
  });
  it('茨の誓い: 味方全員にブロック。殴られたら攻撃者に4（1人1ターン1回）', () => {
    const s = battle(['paladin', 'warrior'], ['stageDHitter']);
    const r = use(s, 'axThornVow', { focus: 'max' });
    expect(r.state.allies.every((a) => a.abilities?.some((x) => x.name === '茨の誓い'))).toBe(true);
    expect(r.state.allies.every((a) => a.block === 7)).toBe(true);
  });
  it('不動の拳: 受けた攻撃の50%を、次のターンの最初の物理カードに（最大+12）', () => {
    const s = battle(['monk'], ['stageDHitter20']);
    const r = use(s, 'axSteadfastFist', { focus: 'max' });
    const t2 = nextTurn(r.state).state;
    expect(t2.allies[0].counters?.fudo).toBe(10);
    const mods = damageModifiers(t2, t2.allies[0], getCard('strike'), t2.enemies[0]);
    expect(mods.addOnce).toBe(10);
  });
});

describe('区切りD-2: 軸② BREAK・弱点', () => {
  it('鎧通しの一撃: 大技を予告している敵にダメージ×2', () => {
    const s = battle(['warrior'], ['stageDBig']);
    const card = getCard('axArmorPierce');
    expect(damageModifiers(s, s.allies[0], card, s.enemies[0], cardTraitAbilities(card)).multiplier).toBeCloseTo(damageModifiers(s, s.allies[0], card, s.enemies[0]).multiplier * 2);
  });
  it('弱点看破（完全成功）: 次の味方の攻撃が弱点扱い（×1.5・BREAK）', () => {
    const s = battle(['hunter'], ['stageDBig']);
    const r = use(s, 'axWeakSight', { focus: 'max' });
    expect(r.state.enemies[0].exposed).toBe(true);
    const ctx = makeCtx(r.state, createRng(1), [], r.state.allies[0], { target: r.state.enemies[0] });
    applyEffect(ctx, { kind: 'damage', amount: 3 });
    expect(r.state.enemies[0].broken).toBe(true);
    expect(r.state.enemies[0].exposed).toBeUndefined();
  });
  it('エレメンタル・チェイン: 弱点の属性に変わる（火に弱い敵には火）', () => {
    const weak = battle(['mage'], ['stageDFireWeak']);
    const plain = battle(['mage']);
    const a = lostHp(weak, use(weak, 'axElementChain', { focus: 'max' }).state);
    const b2 = lostHp(plain, use(plain, 'axElementChain', { focus: 'max' }).state);
    expect(a).toBeGreaterThan(b2);
  });
  it('処刑人の大鎌: 凍結・痺れ・BREAK した敵に×2', () => {
    const s = battle(['necromancer']);
    s.enemies[0].statuses.freeze = 1;
    const card = getCard('axExecutioner');
    expect(damageModifiers(s, s.allies[0], card, s.enemies[0], cardTraitAbilities(card)).multiplier).toBeCloseTo(damageModifiers(s, s.allies[0], card, s.enemies[0]).multiplier * 2);
  });
  it('急所射ち: BREAK した敵を撃つと、フォーカス+1・1枚引く（1ターン1回）', () => {
    const s = battle(['warrior']);
    s.enemies[0].broken = true;
    s.allies[0].focus = 2;
    const r = use(s, 'axVitalShot', { focus: 0 });
    expect(r.state.allies[0].focus).toBe(3);
    expect(r.state.allies[0].hand.length).toBe(1);
  });
  it('魔力の楔: 成功1でも BREAK できる', () => {
    const s = battle(['mage'], ['stageDBig']);
    const r = use(s, 'axManaWedge', { focus: 1 });
    expect(r.state.enemies[0].broken).toBe(true);
  });
  it('導きの光: 選んだ味方の次の攻撃が弱点扱い（BREAK のきっかけ）', () => {
    const s = battle(['priest'], ['stageDBig']);
    const r = use(s, 'axGuidingLight', { focus: 'max' });
    expect(r.state.allies[0].guided).toBe(true);
    const ctx = makeCtx(r.state, createRng(1), [], r.state.allies[0], { target: r.state.enemies[0] });
    applyEffect(ctx, { kind: 'damage', amount: 3 });
    expect(r.state.enemies[0].broken).toBe(true);
  });
});

describe('区切りD-2: 軸③ 連携', () => {
  it('連携のカードは、1人プレイの候補に入らない（仲間がいれば入る）', () => {
    const solo = game(['bard']).heroes[0];
    expect(heroCardPool(solo, true)).not.toContain('axCombination');
    expect(heroCardPool(solo, true)).not.toContain('axAssistPass');
    expect(heroCardPool(solo, false)).toContain('axCombination');
  });
  it('連携の上乗せは合わせて+200%まで。ファイナル・ユニゾンは3倍', () => {
    const s = battle(['warrior', 'mage']);
    s.enemies[0].hitBy = [s.allies[1].id];
    expect(comboMultiplier(s.allies[0], s.enemies[0])).toBeCloseTo(1.2);
    expect(comboMultiplier(s.allies[0], s.enemies[0], 3)).toBeCloseTo(1.6);
    expect(comboMultiplier(s.allies[0], s.enemies[0], 100)).toBeCloseTo(3);
  });
  it('挟撃の陣: 1人でも連携になる。完全成功なら、殴った味方にブロック4', () => {
    const s = battle(['warrior']);
    const r = use(s, 'axPincer', { focus: 'max' });
    expect(comboStage(r.state.allies[0], r.state.enemies[0])).toBe(1);
    const r2 = use(r.state, 'strike', { focus: 'max' });
    expect(r2.state.allies[0].block).toBe(4);
  });
  it('アシスト・パス: 選んだ味方の次の攻撃の連携の段階+1', () => {
    const s = battle(['bard', 'warrior']);
    const r = use(s, 'axAssistPass', { focus: 'max' });
    expect(r.state.allies[0].comboBoost).toBe(1);
    expect(comboStage(r.state.allies[0], r.state.enemies[0])).toBe(1);
  });
  it('コンビネーション: このカードで連携が起きたら、1枚引きマナ+1', () => {
    const s = battle(['warrior', 'mage']);
    s.enemies[0].hitBy = [s.allies[1].id];
    const r = use(s, 'axCombination', { focus: 'max' });
    expect(r.state.allies[0].hand.length).toBe(1);
  });
  it('輪唱: このターン、連携を起こした味方が回復する', () => {
    const s = battle(['bard', 'warrior']);
    const r = use(s, 'axRoundSong', { focus: 'max' });
    r.state.allies[1].hp = 400;
    r.state.enemies[0].hitBy = [r.state.allies[0].id];
    const r2 = use(r.state, 'strike', { ally: 1, focus: 'max' });
    expect(r2.state.allies[1].hp).toBe(404);
  });
});

// ===================== 区切りD-3: 軸④〜⑥・背水 =====================
describe('区切りD-3: 軸④ 状態異常の起爆', () => {
  it('猛毒爆破: 毒×3のダメージ（最大75）。毒は半分になり、半分をほかの敵にうつす', () => {
    const s = battle(['thief'], ['stageDIdler', 'stageDIdler']);
    s.enemies[0].statuses.poison = 10;
    const r = use(s, 'axVenomBurst', { focus: 'max' });
    expect(lostHp(s, r.state, 0)).toBeGreaterThanOrEqual(30);
    expect(r.state.enemies[0].statuses.poison).toBe(5);
    expect(r.state.enemies[1].statuses.poison).toBe(5);
  });
  it('爆炎触媒（完全成功）: 火傷を2倍（1体+10まで）にして、すぐに1回燃やす', () => {
    const s = battle(['mage'], ['stageDIdler', 'stageDIdler']);
    s.enemies[0].statuses.burn = 4;
    const r = use(s, 'axBlazeCatalyst', { focus: 'max' });
    expect(r.state.enemies[0].statuses.burn).toBe(8);
    expect(r.state.enemies[1].statuses.burn ?? 0).toBe(0);
    expect(lostHp(s, r.state, 0)).toBeGreaterThan(0);
  });
  it('氷砕き: 凍結の敵に×2.5。凍結を消して、敵全員に氷片', () => {
    const s = battle(['warrior'], ['stageDIdler', 'stageDIdler']);
    s.enemies[0].statuses.freeze = 1;
    const r = use(s, 'axIceShatter', { focus: 'max' });
    expect(r.state.enemies[0].statuses.freeze).toBe(0);
    expect(lostHp(s, r.state, 1)).toBeGreaterThan(0);
  });
  it('呪詛返しの契り: 自分の悪い状態異常を消し、種類の数×12の闇ダメージと呪い3を敵全員に', () => {
    const s = battle(['hexer']);
    s.allies[0].statuses.poison = 3;
    s.allies[0].statuses.weak = 2;
    const r = use(s, 'axCurseReturn', { focus: 'max' });
    expect(r.state.allies[0].statuses.poison).toBe(0);
    expect(r.state.allies[0].statuses.weak).toBe(0);
    expect(r.state.enemies[0].statuses.curse).toBeGreaterThanOrEqual(3);
    expect(lostHp(s, r.state)).toBeGreaterThan(0);
  });
  it('呪いの刈り入れ: 呪いを起爆して消す。鍛鋼の大鎌《呪い刈り》が働く', () => {
    const g = game(['necromancer']);
    g.heroes[0].equipment.weapon = { uid: 'w', itemId: 'temperedScythe' };
    const s = createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'stageD', name: '確認', enemies: [{ defId: 'stageDIdler' }] } });
    for (const a of s.allies) { a.mana = 30; a.focus = 9; a.maxHp = 500; a.hp = 400; a.block = 0; a.hand = []; }
    s.enemies[0].statuses.curse = 3;
    const r = use(s, 'axCurseHarvest', { focus: 'max' });
    expect(r.state.enemies[0].statuses.curse).toBe(0);
    const g2 = game(['necromancer']);
    const s2 = createBattle({ seed: 11, party: g2.heroes.map(toPartyMember), encounter: { id: 'stageD', name: '確認', enemies: [{ defId: 'stageDIdler' }] } });
    for (const a of s2.allies) { a.mana = 30; a.focus = 9; a.maxHp = 500; a.hp = 400; a.block = 0; a.hand = []; }
    s2.enemies[0].statuses.curse = 3;
    // 闇属性の一撃で呪いが2増えてから起爆するので、消した呪いは5つ → HP+5
    expect(r.state.allies[0].hp - use(s2, 'axCurseHarvest', { focus: 'max' }).state.allies[0].hp).toBe(5);
  });
  it('総崩れ: 悪い状態異常を消し、1種類につき×1.25（最大×2）', () => {
    const plain = battle(['warrior']);
    const a = lostHp(plain, use(plain, 'axCollapse', { focus: 'max' }).state);
    const s = battle(['warrior']);
    s.enemies[0].statuses.weak = 1;
    s.enemies[0].statuses.poison = 1;
    const r = use(s, 'axCollapse', { focus: 'max' });
    expect(r.state.enemies[0].statuses.poison).toBe(0);
    expect(lostHp(s, r.state)).toBeGreaterThan(a);
  });
});

describe('区切りD-3: 軸⑤ オーバーヒール・聖光', () => {
  it('溢れる祝福: あふれた分が、その味方のブロックと自分の聖光（5ごとに1）になる', () => {
    const s = battle(['priest', 'warrior']);
    s.allies[1].hp = s.allies[1].maxHp;
    const a = s.allies[0];
    a.hand.push({ uid: 'ob', cardId: 'axOverflowBlessing' });
    a.focus = 9;
    const r = applyCommand(s, { type: 'PLAY_CARD', playerId: 'P1', characterId: a.id, cardInstanceId: 'ob', targetId: s.allies[1].id, focusUsed: 2 });
    expect(r.error).toBeUndefined();
    expect(r.state.allies[1].block).toBe(12);
    expect(r.state.allies[0].statuses.holyLight).toBe(2);
  });
  it('聖光の上限: 聖騎士・聖王は5、ほかは3', () => {
    const s = battle(['priest', 'paladin']);
    const ctx = makeCtx(s, createRng(1), [], s.allies[0]);
    applyEffect(ctx, { kind: 'holyGain', amount: 9 });
    expect(s.allies[0].statuses.holyLight).toBe(3);
    applyEffect(makeCtx(s, createRng(1), [], s.allies[1]), { kind: 'holyGain', amount: 9 });
    expect(s.allies[1].statuses.holyLight).toBe(5);
  });
  it('聖光解放・セラフィム: 聖光を全部使い、1つにつき+35%。味方全員を3回復', () => {
    const s = battle(['paladin'], ['stageDIdler', 'stageDIdler']);
    s.allies[0].statuses.holyLight = 4;
    s.allies[0].hp = 400;
    const r = use(s, 'axSeraphim', { focus: 'max' });
    expect(r.state.allies[0].statuses.holyLight).toBe(0);
    expect(r.state.allies[0].hp).toBe(403);
    const none = battle(['paladin'], ['stageDIdler', 'stageDIdler']);
    expect(lostHp(s, r.state, 0)).toBeGreaterThan(lostHp(none, use(none, 'axSeraphim', { focus: 'max' }).state, 0));
  });
  it('反転の呪印: このターン、味方1人を回復するカードが、呪印の敵への聖ダメージになる（最大45）', () => {
    const s = battle(['priest', 'warrior']);
    const r = use(s, 'axReversalSeal', { focus: 'max' });
    const st2 = r.state;
    const a = st2.allies[0];
    a.hand.push({ uid: 'mend1', cardId: 'mend' });
    st2.allies[1].hp = st2.allies[1].maxHp;
    const r2 = applyCommand(st2, { type: 'PLAY_CARD', playerId: 'P1', characterId: a.id, cardInstanceId: 'mend1', targetId: st2.allies[1].id, focusUsed: 0 });
    expect(r2.error).toBeUndefined();
    expect(lostHp(st2, r2.state)).toBeGreaterThan(0);
  });
  it('光の蓄え: このターン、聖属性の攻撃をしても聖光が消えない', () => {
    const s = battle(['paladin']);
    s.allies[0].statuses.holyLight = 3;
    const r = use(s, 'axLightHoard', { focus: 'max' });
    expect(r.state.allies[0].statuses.holyLight).toBe(5); // 3 ＋ 完全成功1 ＋ 能力《蓄光》1
    const ctx = makeCtx(r.state, createRng(1), [], r.state.allies[0], { target: r.state.enemies[0] });
    applyEffect(ctx, { kind: 'damage', amount: 3, element: 'holy' });
    expect(r.state.allies[0].statuses.holyLight).toBe(5); // 3 ＋ 完全成功1 ＋ 能力《蓄光》1
  });
});

describe('区切りD-3: 軸⑥ 0コスト回転・お供号令', () => {
  it('クイックドロー: このターンの4枚目なら、マナ+1（1ターン1回）', () => {
    const s = battle(['thief']);
    s.allies[0].played = 3;
    const before = s.allies[0].mana;
    const r = use(s, 'axQuickDraw', { focus: 'max' });
    expect(r.state.allies[0].mana).toBe(before + 1);
  });
  it('お供の突撃号令（完全成功）: 自分の召喚がすぐに2回攻撃する', () => {
    const s = battle(['machinist']);
    const r = use(s, 'axPetCharge', { focus: 'max' });
    expect(r.state.log.filter((l) => l.text.includes('攻撃（号令）')).length).toBe(2);
  });
  it('手数の極み: 使ったカードの枚数のブロック（最大10）', () => {
    const s = battle(['brawler']);
    s.allies[0].played = 6;
    const r = use(s, 'axFlurryGuard', { focus: 'max' });
    expect(r.state.allies[0].block).toBe(7);
  });
  it('ごほうび: お供の「ターン終了時」の能力が無ければ、フォーカス+1（1ターン1回）', () => {
    const s = battle(['warrior']);
    s.allies[0].focus = 2;
    const r = use(s, 'axTreat', { focus: 1 });
    expect(r.state.allies[0].focus).toBe(2);
  });
  it('群れの狩り: お供・召喚1体につき+20%（最大+80%）', () => {
    const s = battle(['machinist']);
    const card = getCard('axPackHunt');
    const base = damageModifiers(s, s.allies[0], card, s.enemies[0]).multiplier;
    expect(damageModifiers(s, s.allies[0], card, s.enemies[0], cardTraitAbilities(card)).multiplier).toBeCloseTo(base * 1.2);
  });
  it('弾込め: 次の「×N回」のカードの回数+1', () => {
    const s = battle(['machinist']);
    const r = use(s, 'axLoadRound', { focus: 'max' });
    expect(r.state.allies[0].extraHits).toBe(1);
    const r2 = use(r.state, 'samuraiSwallow', { focus: 'max' });
    expect(r2.state.allies[0].extraHits).toBeUndefined();
    expect(r2.state.log.at(-1)?.text).toContain('弾込め');
  });
  it('流れる連撃: このターンのコスト0のカードの数だけ回数（最大4）', () => {
    const s = battle(['thief']);
    s.allies[0].playedZero = 3;
    const r = use(s, 'axFlowingStrikes', { focus: 'max' });
    expect(r.state.log.at(-1)?.text).toContain('3連撃');
  });
});

describe('区切りD-3: 背水', () => {
  it('逆境の刃: 減っているHPの20%（最大+12）を足す', () => {
    const full = battle(['berserker']);
    const a = lostHp(full, use(full, 'axAdversity', { focus: 'max' }).state);
    const hurt = battle(['berserker']);
    hurt.allies[0].hp = 100;
    expect(lostHp(hurt, use(hurt, 'axAdversity', { focus: 'max' }).state)).toBeGreaterThan(a);
  });
  it('血の代価: 失ったHPを、次の攻撃カードに足す（最大+15）。払った分も入る', () => {
    const s = battle(['darkKnight']);
    s.allies[0].counters = { ...(s.allies[0].counters ?? {}), hpLostTurn: 20 };
    const r = use(s, 'axBloodPrice', { focus: 'max' });
    expect(r.state.allies[0].counters?.bloodAdd).toBe(15);
    expect(r.state.allies[0].block).toBe(7);
    expect(damageModifiers(r.state, r.state.allies[0], getCard('strike'), r.state.enemies[0]).addOnce).toBe(15);
    const r2 = use(r.state, 'strike', { focus: 'max' });
    expect(r2.state.allies[0].counters?.bloodAdd).toBe(0);
  });
  it('命綱: 次の敵の番が終わるまで、HPは1より下がらない', () => {
    const s = battle(['berserker'], ['stageDHitter20']);
    s.allies[0].hp = 10;
    const r = use(s, 'axLifeline', { focus: 'max' });
    const t2 = nextTurn(r.state).state;
    expect(t2.allies[0].dead).toBe(false);
    expect(t2.allies[0].hp).toBe(1);
  });
});

// ===================== 区切りD-4: 決め技・武器のカードの付け替え =====================
describe('区切りD-4: 決め技', () => {
  it('最上位・特殊の23職すべてが、決め技（レジェンド・1戦闘1回）を1枚ずつ持つ', () => {
    const jobs = CLASSES.all.filter((j) => j.tier === 'top' || j.tier === 'special');
    expect(jobs).toHaveLength(23);
    const seen = new Set<string>();
    for (const j of jobs) {
      expect(j.jobCards ?? [], j.id).toHaveLength(1);
      const card = getCard(j.jobCards![0]);
      expect(card.rarity, card.id).toBe('legend');
      expect(card.exhaust, card.id).toBe(true);
      expect(card.trait, card.id).toBeDefined();
      expect(seen.has(card.id), card.id).toBe(false);
      seen.add(card.id);
    }
  });
  it('秘剣・天翔龍閃（成功2）: 大技の予告をすぐに BREAK。完全成功でマナ+2', () => {
    const s = battle(['warrior'], ['stageDBig']);
    s.allies[0].mana = 5;
    const r = use(s, 'fxHeavenDragon', { focus: 'max' });
    expect(r.state.enemies[0].broken).toBe(true);
    expect(r.state.allies[0].abilities?.some((a) => a.name === '剣聖の極み')).toBe(true);
  });
  it('覇王滅砕撃: 倒した敵1体につき、味方全員のフォーカス+1', () => {
    ENEMIES.register({ ...dummy, id: 'stageDWeak', name: '確認用の弱い置物', maxHp: 1, actions: wait });
    const s = battle(['warrior', 'mage'], ['stageDWeak', 'stageDWeak', 'stageDIdler']);
    for (const a of s.allies) a.focus = 1;
    const r = use(s, 'fxConquerorCrush', { focus: 'max' });
    expect(r.state.allies[1].focus).toBe(3);
  });
  it('無想阿修羅拳: この戦闘の物理カード3枚ごとに回数+1（最大+3）', () => {
    const s = battle(['brawler']);
    s.allies[0].counters = { ...(s.allies[0].counters ?? {}), physBattle: 30 };
    const r = use(s, 'fxAsuraFist', { focus: 'max' });
    expect(r.state.log.at(-1)?.text).toContain('10連打');
  });
  it('死の宣告・アビス: 呪い・毒・火傷の合計×4を足し、悪い状態異常を全部2倍に', () => {
    const s = battle(['hexer']);
    s.enemies[0].statuses.poison = 3;
    const r = use(s, 'fxAbyssVerdict', { focus: 'max' });
    expect(r.state.enemies[0].statuses.poison).toBe(6);
  });
  it('聖王の絶対領域: 味方全員のブロックが次の番まで残り（上限50）、悪い状態異常を受けない', () => {
    const s = battle(['paladin', 'warrior']);
    const r = use(s, 'fxHolySanctum', { focus: 'max' });
    expect(r.state.allies.every((a) => a.block === 25)).toBe(true);
    const t2 = nextTurn(r.state).state;
    expect(t2.allies.every((a) => a.block === 25)).toBe(true);
  });
  it('忍法・八咫烏: 分身を2つまで戻し、霞（次の攻撃1回を0）を得る', () => {
    const s = battle(['ninja']);
    s.allies[0].summons = [];
    const r = use(s, 'fxYatagarasu', { focus: 'max' });
    expect(r.state.allies[0].summons?.filter((x) => x.intercept).length).toBe(3);
  });
  it('奥義・無明逆流れ（成功1）: 居合（次の物理×4）と、最初の攻撃を無効にして25で返す', () => {
    const s = battle(['samurai'], ['stageDHitter20']);
    const r = use(s, 'fxMumyou', { focus: 'max' });
    expect(r.state.allies[0].attackCharge?.multiplier).toBe(4);
    const before = r.state.allies[0].hp;
    const t2 = nextTurn(r.state).state;
    expect(t2.allies[0].hp).toBe(before);
    expect(lostHp(r.state, t2)).toBeGreaterThan(0);
  });
  it('ラグナロク・ブレード: 弱点が無い敵にも、弱点を突いた扱い（BREAK）', () => {
    const s = battle(['swordmaster'], ['stageDBig']);
    const r = use(s, 'fxRagnarok', { focus: 0 });
    expect(r.state.enemies[0].broken).toBe(true);
  });
  it('百鬼夜行: 屍兵を3体まで呼ぶ', () => {
    const s = battle(['necromancer']);
    const r = use(s, 'fxHundredNight', { focus: 'max' });
    expect(r.state.allies[0].summons?.filter((x) => x.group === 'skeletonSoldier').length).toBe(3);
  });
  it('ブラッド・イクリプス: 今のHPの半分を払い、減っているHP×2.0（最大100）', () => {
    const s = battle(['darkKnight']);
    s.allies[0].hp = 400;
    const r = use(s, 'fxBloodEclipse', { focus: 'max' });
    expect(r.state.allies[0].hp).toBeGreaterThanOrEqual(200);
    expect(lostHp(s, r.state)).toBeGreaterThan(0);
  });
  it('運命のグランドクロス（成功1）: 味方それぞれ、次に使う1枚だけ完全成功', () => {
    const s = battle(['priest', 'warrior']);
    const r = use(s, 'fxGrandCross', { focus: 'max' });
    expect(r.state.allies.every((a) => a.abilities?.some((x) => x.name === '運命のグランドクロス'))).toBe(true);
    const r2 = use(r.state, 'strike', { ally: 1, focus: 0 });
    expect(r2.state.log.at(-1)?.text).toContain('完全成功');
  });
  it('英雄たちの交響曲: 1人の時は自分に効く', () => {
    const s = battle(['bard']);
    s.allies[0].focus = 1;
    const r = use(s, 'fxSymphonia', { focus: 'max' });
    expect(r.state.allies[0].counters?.nextAtkPct).toBe(50);
  });
  it('オール・オア・ナッシング: 完全成功で敵全員に77（＋77G）', () => {
    const s = battle(['phantomThief']);
    const r = use(s, 'fxAllOrNothing', { focus: 'max' });
    expect(lostHp(s, r.state)).toBeGreaterThanOrEqual(77);
  });
});

describe('区切りD-4: 武器のカードの付け替え', () => {
  it('★ の武器23本は、決めたカードが付く', () => {
    const want: Record<string, string> = { mithrilSword: 'axArmorPierce', rifledGun: 'axLoadRound', duelistsGun: 'axQuickDraw', companionWhip: 'axPetCharge', rendingWhip: 'axPackHunt', deepthoughtTome: 'axBlazeCatalyst', dawnScepter: 'axOverflowBlessing', temperedScythe: 'axCurseHarvest', wellspringLute: 'axRoundSong' };
    for (const [item, card] of Object.entries(want)) expect(ITEMS.get(item).cards?.[0]?.cardId, item).toBe(card);
  });
  it('湧泉のリュート: 戦闘に1人だけの時は、輪唱の代わりに終曲', () => {
    const g = game(['bard']);
    g.heroes[0].equipment.weapon = { uid: 'lute', itemId: 'wellspringLute' };
    expect(battleDeck(g.heroes[0], true).filter((c) => c.fromWeapon).every((c) => c.cardId === 'wtInstFinale')).toBe(true);
    expect(battleDeck(g.heroes[0], false).filter((c) => c.fromWeapon).every((c) => c.cardId === 'axRoundSong')).toBe(true);
  });
});

describe('区切りD: 「最大〇〇」は、倍率を掛けた後のダメージの上限', () => {
  it('ブラッド・イクリプスは最大100・シールドスラムは最大60', () => {
    const s = battle(['darkKnight']);
    s.allies[0].hp = 120;
    expect(lostHp(s, use(s, 'fxBloodEclipse', { focus: 'max' }).state)).toBe(100);
    const g = battle(['guardian']);
    g.allies[0].block = 99;
    expect(lostHp(g, use(g, 'axShieldSlam', { focus: 'max' }).state)).toBe(60);
  });
});
