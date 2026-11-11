// ラインナップの作り直し 区切りD（docs/tasks/lineup-stageD-plan.md）
// D-1: 1枚を複数の場所に置く・同じ中身のカード36組をまとめる・例外の2組・HPを払うカードの整理・保存 v21
import { describe, expect, it } from 'vitest';
import { CARDS, cardLineages, cardWeaponTypes, getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
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
