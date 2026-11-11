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
import { damageModifiers } from '../abilities';

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
