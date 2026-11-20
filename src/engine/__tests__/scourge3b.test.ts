// ===== シナリオ2の作り直し 区切り3b: 新しい災厄3体（白狼王・凍て鐘の亡霊・灯を喰らう影）の敵・段階・登録 =====
// docs/tasks/scenario2-scourge-enemies-proposal.md（ふだんの姿。5つとも A）・scenario2-theme-scourge-proposal.md §2-2・§2-3・§5（段階。A）
// - 3体の行動（群れの牙の回数・追い立てる・葬送の鐘の割り込み・灯を啜る）・段階（吹雪に隠れる・鐘のこだま・灯喰い）・手下（1人・2人・4人）
// - 吹雪に隠れるの線引き（単体・全体・お供・召喚・毒・反撃・道具・状態異常だけ・BREAK）
// - bot が止まらない・オンラインの待ち合わせ・保存して再開で同じ
// - シナリオ2の冒険（種を多数）で災厄が3体出る・悪さと加護・倒すと消える・専用の装備が落ちる。灯を喰らう影は錫杖を使えるジョブがいないと出ない
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { getEnemy, getEnemyAction } from '../../data/enemies';
import { getItem } from '../../data/items';
import { getScenario } from '../../data/scenarios';
import { SCOURGES, TERRAINS } from '../../data/world';
import { intentView } from '../../components/format';
import type { BattleState, CardDef, Command, GameCommand, GameState, PlayerId } from '../../types';
import { applyCommand, createBattle, predictCardTotals } from '../battle/battle';
import { dealDamage, makeCtx } from '../battle/effects';
import { enemyHitDamage, incomingDamage, intentHitsOn } from '../battle/intents';
import { focusFeedOf, lampBonus } from '../battle/phases';
import { loseHp } from '../battle/units';
import { cleverBattleCommand } from '../botClever';
import { applyGameCommand, buildDungeon, createGame, startBattleWith } from '../index';
import { createRng } from '../rng';
import { dungeonDetourLines, scourgeFits } from '../game/world/detour';
import { hexDistance } from '../game/world/hex';
import { scourgeHeldGear } from '../game/world/scourgeGear';
import { scourgeCurse } from '../game/world/scourgeCurse';
import { aliveScourges, scourgeEnemies, scourgesFor, spawnScourge } from '../game/world/scourges';
import { party } from './helpers';

const FK = 'frozenKingdom';
const IDS = ['whiteWolfKing', 'frostBellWraith', 'lampEaterShade'] as const;
const BOSS = { whiteWolfKing: 'scourgeWhiteWolfKing', frostBellWraith: 'scourgeBellWraith', lampEaterShade: 'scourgeLightEater' } as const;

// ---------- 確かめ用のカード ----------
const card = (c: Partial<CardDef> & Pick<CardDef, 'id' | 'tiers'>): CardDef => ({ name: c.id, category: 'physical', cost: 0, slots: 1, baseChance: 100, target: 'enemy', ...c });
for (const c of [
  card({ id: 'sc3bHit', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 5 }] }] }),
  card({ id: 'sc3bBig', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 30 }] }] }),
  card({ id: 'sc3bHuge', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 90 }] }] }),
  card({ id: 'sc3bFire', category: 'magic', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 5, element: 'fire' }] }] }),
  card({ id: 'sc3bHoly', category: 'magic', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 5, element: 'holy' }] }] }),
  card({ id: 'sc3bAll', target: 'allEnemies', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 5 }] }] }),
  card({ id: 'sc3bWeak', category: 'skill', tiers: [{ minSuccesses: 0, effects: [{ kind: 'applyStatus', status: 'weak', amount: 1 }] }] }),
  card({ id: 'sc3bPoison', category: 'skill', tiers: [{ minSuccesses: 0, effects: [{ kind: 'applyStatus', status: 'poison', amount: 6 }] }] }),
  card({ id: 'sc3bFocus', slots: 3, tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 1 }] }] }),
  card({ id: 'sc3bGuard', category: 'skill', target: 'self', tiers: [{ minSuccesses: 0, effects: [{ kind: 'block', amount: 5 }] }] }),
]) if (!CARDS.has(c.id)) CARDS.register(c);

/** 災厄の戦闘（中ボスと同じ扱い・災厄の印つき）。n = 味方の人数（担当は P1〜Pn） */
function fight(boss: string, minions: string[], n = 1, seed = 3): BattleState {
  const members = party(...['warrior', 'mage', 'priest', 'thief'].slice(0, n)).map((m, i) => ({ ...m, playerId: `P${i + 1}` as PlayerId }));
  const s = createBattle({ seed, party: members, encounter: { id: 'sc3b', name: '災厄', enemies: [boss, ...minions].map((defId) => ({ defId, level: 7 })), midboss: true, scourge: true } });
  for (const a of s.allies) {
    a.mana = 30;
    a.focus = 5;
    a.focusMax = 5;
    a.hp = a.maxHp = 999;
    a.block = 0;
    a.hand = [];
  }
  return s;
}
let uid = 0;
function use(s: BattleState, cardId: string, target?: string, ally = 0, focusUsed = 0) {
  const a = s.allies[ally];
  const inst = { uid: `sc3b-${uid++}`, cardId };
  a.hand.push(inst);
  const r = applyCommand(s, { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: inst.uid, targetId: target, focusUsed });
  expect(r.error, cardId).toBeUndefined();
  return r;
}
/** 味方の番を終え（全員の準備完了）、敵の番を最後まで進める */
function enemyTurn(s: BattleState): BattleState {
  for (const p of new Set(s.allies.filter((a) => !a.dead).map((a) => a.playerId))) if (s.phase === 'ally') s = applyCommand(s, { type: 'END_TURN', playerId: p }).state;
  for (let i = 0; s.phase === 'enemy' && i < 20; i++) s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
  return s;
}
/** HPの減り（イベントから） */
const hurt = (events: { type: string; unitId?: string; amount?: number; sourceId?: string }[], id: string, from?: string) =>
  events.filter((e) => e.type === 'damage' && e.unitId === id && (!from || e.sourceId === from)).reduce((n, e) => n + (e.amount ?? 0), 0);
/** 敵の番を1回進めた時のイベント（全部） */
function enemyEvents(s: BattleState): { state: BattleState; events: ReturnType<typeof applyCommand>['events'] } {
  const events: ReturnType<typeof applyCommand>['events'] = [];
  for (const p of new Set(s.allies.filter((a) => !a.dead).map((a) => a.playerId))) if (s.phase === 'ally') { const r = applyCommand(s, { type: 'END_TURN', playerId: p }); s = r.state; events.push(...r.events); }
  for (let i = 0; s.phase === 'enemy' && i < 20; i++) { const r = applyCommand(s, { type: 'ENEMY_STEP' }); s = r.state; events.push(...r.events); }
  return { state: s, events };
}
/** HPの境目（50%）の少し上に置いてから、全体攻撃で越えさせる → 敵の番 → 次の予告が開幕の一手 */
function enterPhase(s: BattleState, idx = 0): BattleState {
  const e = s.enemies[idx];
  e.hp = Math.floor(e.maxHp / 2) + 1;
  s = use(s, 'sc3bAll').state;
  expect(s.enemies[idx].phase).toBe(1);
  s = enemyTurn(s);
  return s;
}

// ---------- データ ----------

describe('区切り3b: 3体のデータ（案の表のとおり）', () => {
  it('登録・地図の一覧・HP・弱点と耐性・手下・絵と光の色・💀', () => {
    expect(SCOURGES.all.slice(-3).map((d) => d.id)).toEqual([...IDS]);
    expect(getScenario(FK).map!.scourges).toEqual(['stormWitch', ...IDS]);
    const want = {
      whiteWolfKing: { hp: 170, weak: ['fire'], resist: ['ice'], minions: ['frostWolf', 'frostWolf', 'emberFrostWolf'], art: 'frostWolf', aura: 'iron', gear: 'springWaitCloak' },
      frostBellWraith: { hp: 150, weak: ['holy', 'thunder'], resist: ['ice', 'dark'], minions: ['frozenSoldier', 'iceSwordsman', 'frozenSoldier'], art: 'frostBellKnight', aura: 'holy', gear: 'everIceBracer' },
      lampEaterShade: { hp: 160, weak: ['holy', 'fire'], resist: ['dark', 'ice'], minions: ['frozenGhoul', 'frostSprite', 'frozenGhoul'], art: 'frostMoth', aura: 'shadow', gear: 'springbringerScepter' },
    };
    for (const id of IDS) {
      const d = SCOURGES.get(id);
      const e = getEnemy(d.boss);
      const w = want[id];
      expect(d.boss).toBe(BOSS[id]);
      expect(e.maxHp, id).toBe(w.hp);
      expect(e.baseLevel).toBe(7);
      expect([e.exp, e.gold]).toEqual([90, 60]);
      expect(e.icon).toBe('💀');
      expect(e.weak).toEqual(w.weak);
      expect(e.resist).toEqual(w.resist);
      expect(d.minions).toEqual(w.minions);
      expect(e.variantOf).toBe(w.art);
      expect(e.aura).toBe(w.aura);
      expect(d.gear).toBe(w.gear);
      expect(d.appearText.length).toBeGreaterThan(10);
      expect(d.clearText.length).toBeGreaterThan(10);
      // ブロックも回復の予告も、ふだんの姿には無い（影の「灯を啜る」の当てた分の回復を除く）
      for (const a of e.actions) for (const x of a.effects) expect(x.kind, `${id} ${a.id}`).not.toBe('block');
      expect(e.phases).toHaveLength(1);
      expect(e.phases![0].belowHpPct).toBe(50);
    }
    expect(getEnemy('scourgeWhiteWolfKing').size).toBe(1.4);
    expect(getEnemy('scourgeLightEater').size).toBe(1.5);
    expect(getEnemy('scourgeLightEater').pattern).toBe('random');
  });

  it('手下: 1人・2人は2体、4人は3体（レベルは本体と同じ）', () => {
    for (const n of [1, 2, 4]) {
      const g = frozenGame(5, n);
      for (const id of IDS) {
        const def = SCOURGES.get(id);
        const tile = g.world!.tiles.findIndex((t) => !t.f && TERRAINS.get(t.t).moveCost > 0);
        const list = scourgeEnemies(g, g.world!, def, tile);
        expect(list.length, `${id} ${n}人`).toBe(1 + (n >= 4 ? BALANCE.scourge.minions4p : BALANCE.scourge.minions));
        expect(list[0].defId).toBe(def.boss);
        expect(new Set(list.map((x) => x.level)).size).toBe(1);
      }
    }
  });
});

// ---------- 白狼王 ----------

describe('白狼王: 群れの牙・追い立てる・噛み裂く', () => {
  it('1ターン目は群れの牙。回数 = 生きている敵の数（王も数える）。手下を倒すと、予告の回数がその場で減り、実際の回数も減る', () => {
    let s = fight(BOSS.whiteWolfKing, ['frostWolf', 'frostWolf']);
    const wolf = s.enemies[0];
    expect(wolf.intent!.actionId).toBe('wkPack');
    const target = s.allies.find((a) => a.id === wolf.intent!.targetId)!;
    expect(intentHitsOn(wolf, target, s.allies, s.enemies)).toHaveLength(3);
    expect(intentView(s, wolf)!.parts[0]).toMatchObject({ kind: 'attack', hits: 3 });
    // 手下を1体倒す
    loseHp(s, s.enemies[1], 9999, createRng(1), []);
    expect(intentView(s, s.enemies[0])!.parts[0]).toMatchObject({ kind: 'attack', hits: 2 });
    expect(intentView(s, s.enemies[0])!.details.join('')).toContain('生きている敵の数2');
    const { events } = enemyEvents(s);
    expect(events.filter((e) => e.type === 'damage' && e.unitId === target.id && e.sourceId === wolf.uid)).toHaveLength(2);
  });

  it('4人の冒険（手下3体）は ×4 から始まる', () => {
    const s = fight(BOSS.whiteWolfKing, ['frostWolf', 'frostWolf', 'emberFrostWolf'], 4);
    const wolf = s.enemies[0];
    expect(intentHitsOn(wolf, s.allies.find((a) => a.id === wolf.intent!.targetId)!, s.allies, s.enemies)).toHaveLength(4);
  });

  it('追い立てる: 前のターンに王を最後に殴った味方を狙う（外れた一撃は数えない）', () => {
    let s = fight(BOSS.whiteWolfKing, ['frostWolf', 'frostWolf'], 2);
    s = use(s, 'sc3bHit', s.enemies[0].uid, 0).state;
    s = use(s, 'sc3bHit', s.enemies[0].uid, 1).state;
    s = enemyTurn(s);
    expect(s.enemies[0].intent!.actionId).toBe('wkHunt');
    expect(s.enemies[0].intent!.targetId).toBe(s.allies[1].id);
    expect(getEnemyAction('scourgeWhiteWolfKing', 'wkHunt').behavior).toBe('hunt');
  });

  it('段階: 🌀吹雪に隠れる → 奇襲 → 群れの牙 → 隠れる。隠れるのは次の敵の番の始めまで', () => {
    let s = fight(BOSS.whiteWolfKing, ['frostWolf', 'frostWolf']);
    for (const e of s.enemies.slice(1)) e.hp = e.maxHp = 99999;
    s = enterPhase(s);
    expect(s.enemies[0].intent!.actionId).toBe('wkHide');
    expect(intentView(s, s.enemies[0])!.opening).toBeTruthy();
    s = enemyTurn(s);
    expect(s.enemies[0].hidden).toBe(true);
    expect(s.enemies[0].intent!.actionId).toBe('wkAmbush');
    expect(intentView(s, s.enemies[0])!.details.some((d) => d.startsWith('❄吹雪に隠れている'))).toBe(true);
    s = enemyTurn(s);
    expect(s.enemies[0].hidden).toBeUndefined();
    expect(s.enemies[0].intent!.actionId).toBe('wkPack2');
    s = enemyTurn(s);
    expect(s.enemies[0].intent!.actionId).toBe('wkHide');
  });

  it('隠れる予告を火の弱点で BREAK すると隠れられない', () => {
    let s = fight(BOSS.whiteWolfKing, ['frostWolf', 'frostWolf']);
    s = enterPhase(s);
    expect(s.enemies[0].intent!.actionId).toBe('wkHide');
    s = use(s, 'sc3bFire', s.enemies[0].uid, 0, 1).state;
    expect(s.enemies[0].broken).toBe(true);
    s = enemyTurn(s);
    expect(s.enemies[0].hidden).toBeUndefined();
  });
});

describe('吹雪に隠れる: 線引き（かばうと同じ）', () => {
  /** 白狼王が隠れている味方の番 */
  const hidden = () => {
    const s = fight(BOSS.whiteWolfKing, ['frostWolf', 'frostWolf']);
    s.enemies[0].hidden = true;
    return s;
  };
  it('単体のカード: ダメージは0（外れる）。ブロック・連携の記録も変わらない。手下には当たる', () => {
    const s = hidden();
    const hp = s.enemies[0].hp;
    const r = use(s, 'sc3bHit', s.enemies[0].uid);
    expect(r.state.enemies[0].hp).toBe(hp);
    expect(r.events.some((e) => e.type === 'damage' && e.unitId === s.enemies[0].uid && e.missed)).toBe(true);
    expect(r.state.enemies[0].hitBy ?? []).toEqual([]);
    expect(r.state.log.some((l) => l.text.includes('吹雪に隠れている'))).toBe(true);
    const m = use(r.state, 'sc3bHit', s.enemies[1].uid);
    expect(m.state.enemies[1].hp).toBeLessThan(s.enemies[1].hp);
  });
  it('全体攻撃・道具・お供・召喚・分身・反撃（カードの無いダメージ）・毒は当たる', () => {
    const s = hidden();
    const hp = s.enemies[0].hp;
    expect(use(s, 'sc3bAll').state.enemies[0].hp).toBeLessThan(hp);
    const item = applyCommand(s, { type: 'USE_ITEM', playerId: 'P1', characterId: s.allies[0].id, targetId: s.enemies[0].uid, itemName: '氷結の魔石', effects: [{ kind: 'iceGem', amount: 20 }] });
    expect(item.error).toBeUndefined();
    expect(item.state.enemies[0].hp).toBeLessThan(hp);
    const viaCard = getCardForTest('sc3bHit');
    for (const via of ['pet', 'summon'] as const) {
      const t = structuredClone(s);
      dealDamage(makeCtx(t, createRng(1), [], t.allies[0], { target: t.enemies[0], card: viaCard, via }), t.enemies[0], 10);
      expect(t.enemies[0].hp, via).toBeLessThan(hp);
    }
    const echo = structuredClone(s);
    const ctx = makeCtx(echo, createRng(1), [], echo.allies[0], { target: echo.enemies[0], card: viaCard });
    ctx.echo = true;
    dealDamage(ctx, echo.enemies[0], 10);
    expect(echo.enemies[0].hp).toBeLessThan(hp);
    const counter = structuredClone(s);
    dealDamage(makeCtx(counter, createRng(1), [], counter.allies[0], { attacker: counter.enemies[0] }), counter.enemies[0], 10);
    expect(counter.enemies[0].hp).toBeLessThan(hp);
    // 毒（状態異常だけの単体のカードは付く → 敵の番の終わりに毒で減る）
    const p = use(s, 'sc3bPoison', s.enemies[0].uid).state;
    expect(p.enemies[0].statuses.poison).toBe(6);
    const after = enemyTurn(p);
    expect(after.enemies[0].hp).toBeLessThan(hp);
  });
  it('状態異常だけの単体のカードは付く（弱体）', () => {
    const s = hidden();
    expect(use(s, 'sc3bWeak', s.enemies[0].uid).state.enemies[0].statuses.weak).toBe(1);
  });
  it('隠れている間も単体のカードで BREAK はできる（火の完全成功。ダメージは0のまま・奇襲が半分）', () => {
    let s = fight(BOSS.whiteWolfKing, ['frostWolf', 'frostWolf']);
    s = enterPhase(s);
    s = enemyTurn(s);
    expect(s.enemies[0].hidden).toBe(true);
    expect(s.enemies[0].intent!.actionId).toBe('wkAmbush');
    const hp = s.enemies[0].hp;
    const r = use(s, 'sc3bFire', s.enemies[0].uid, 0, 1);
    expect(r.state.enemies[0].hp).toBe(hp);
    expect(r.state.enemies[0].broken).toBe(true);
    expect(r.events.some((e) => e.type === 'break' && e.enemyUid === s.enemies[0].uid)).toBe(true);
    const target = r.state.allies.find((a) => a.id === r.state.enemies[0].intent!.targetId)!;
    const half = intentHitsOn(r.state.enemies[0], target)[0];
    const full = intentHitsOn(s.enemies[0], s.allies.find((a) => a.id === target.id)!)[0];
    expect(half).toBe(enemyHitDamage(s.enemies[0], Math.floor(22 * BALANCE.breakPower), target));
    expect(half).toBeLessThan(full);
  });
  it('見込み: 単体のカードは「外れる」（予測・札）。全体のカードは外れない', () => {
    const s = hidden();
    const a = s.allies[0];
    a.hand = [{ uid: 'p1', cardId: 'sc3bHit' }, { uid: 'p2', cardId: 'sc3bAll' }];
    const one = predictCardTotals(s, a.id, 'p1', s.enemies[0].uid, 0, 0).find((t) => t.id === s.enemies[0].uid);
    expect(one?.missed).toBe(true);
    const all = predictCardTotals(s, a.id, 'p2', undefined, 0, 0).find((t) => t.id === s.enemies[0].uid);
    expect(all?.missed).toBeUndefined();
    expect(all!.hpLoss[1]).toBeGreaterThan(0);
  });
  it('bot: 隠れている王を単体で狙わない。隠れている王しかいない時も、番は有限の手で終わる', () => {
    const s = hidden();
    s.allies[0].hand = [{ uid: 'b1', cardId: 'sc3bHit' }, { uid: 'b2', cardId: 'sc3bAll' }];
    const cmd = cleverBattleCommand(s) as Extract<Command, { type: 'PLAY_CARD' }>;
    expect(cmd.type).toBe('PLAY_CARD');
    expect(cmd.targetId === s.enemies[0].uid && cmd.cardInstanceId === 'b1').toBe(false);
    const alone = fight(BOSS.whiteWolfKing, []);
    alone.enemies[0].hidden = true;
    alone.allies[0].hand = [{ uid: 'b3', cardId: 'sc3bHit' }, { uid: 'b4', cardId: 'sc3bGuard' }];
    let t = alone;
    for (let k = 0; k < 10; k++) {
      const c = cleverBattleCommand(t);
      if (!c) break;
      expect(c.type === 'PLAY_CARD' && c.cardInstanceId === 'b3').toBe(false);
      t = applyCommand(t, c).state;
    }
    expect(applyCommand(t, { type: 'END_TURN', playerId: 'P1' }).error).toBeUndefined();
  });
});

function getCardForTest(id: string): CardDef {
  return CARDS.get(id);
}

// ---------- 凍て鐘の亡霊 ----------

describe('凍て鐘の亡霊: 葬送の鐘（割り込み）・鐘のこだま', () => {
  it('手下が倒れていなければ順番どおり。倒れると3ターンに1回「葬送の鐘」が割り込む。段階に入ると鳴らない', () => {
    let s = fight(BOSS.frostBellWraith, ['frozenSoldier', 'iceSwordsman']);
    s.enemies[0].hp = s.enemies[0].maxHp = 99999;
    expect(s.enemies[0].intent!.actionId).toBe('bwStrike');
    s = enemyTurn(s);
    expect(s.enemies[0].intent!.actionId).toBe('bwDouble');
    loseHp(s, s.enemies[1], 9999, createRng(1), []);
    const seen: string[] = [];
    for (let k = 0; k < 7; k++) {
      s = enemyTurn(s);
      seen.push(s.enemies[0].intent!.actionId);
    }
    expect(seen.filter((x) => x === 'bwFuneral').length).toBeGreaterThanOrEqual(2);
    // 3ターンに1回（続けて鳴らない・間は2ターン以上）
    const at = seen.flatMap((x, i) => (x === 'bwFuneral' ? [i] : []));
    for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1]).toBeGreaterThanOrEqual(3);
    const fun = getEnemyAction('scourgeBellWraith', 'bwFuneral');
    expect(fun.effects.find((e) => e.kind === 'applyStatus')).toMatchObject({ status: 'paralysis', amount: 1, to: 'foes' });
    // 段階に入ると鳴らない
    let p = fight(BOSS.frostBellWraith, ['frozenSoldier', 'iceSwordsman']);
    loseHp(p, p.enemies[1], 9999, createRng(1), []);
    p = enterPhase(p);
    p.enemies[0].hp = 99999;
    p.enemies[0].maxHp = 199999;
    for (let k = 0; k < 6; k++) {
      p = enemyTurn(p);
      expect(p.enemies[0].intent!.actionId).not.toBe('bwFuneral');
    }
  });

  it('段階: 🌀弔鐘を構える → 氷の鐘打ち → 凍える響き → 鐘のこだま。こだま = そのターンのいちばん大きな一撃（予告の数字が殴るたびに育つ）が全員に返る', () => {
    let s = fight(BOSS.frostBellWraith, ['frozenSoldier', 'iceSwordsman'], 2);
    for (const e of s.enemies.slice(1)) e.hp = e.maxHp = 99999;
    s = enterPhase(s);
    const w = () => s.enemies[0];
    expect(w().intent!.actionId).toBe('bwToll');
    expect(intentView(s, w())!.parts[0]).toMatchObject({ kind: 'attackAll', damage: 0, label: 'こだま' });
    s = use(s, 'sc3bHit', w().uid, 0).state;
    const small = w().echoMax!;
    expect(small).toBeGreaterThan(0);
    s = use(s, 'sc3bBig', w().uid, 1).state;
    const big = w().echoMax!;
    expect(big).toBeGreaterThan(small);
    s = use(s, 'sc3bHit', w().uid, 0).state;
    expect(w().echoMax).toBe(big);
    expect((intentView(s, w())!.parts[0] as { damage: number }).damage).toBe(Math.min(40, big));
    for (const a of s.allies) a.block = 0;
    const { state, events } = enemyEvents(s);
    s = state;
    for (const a of s.allies) expect(hurt(events, a.id, s.enemies[0].uid), a.id).toBe(Math.min(40, big));
    expect(s.enemies[0].echoMax).toBeUndefined();
    // 順番
    expect(s.enemies[0].intent!.actionId).toBe('bwIceStrike');
    s = enemyTurn(s);
    expect(s.enemies[0].intent!.actionId).toBe('bwFreezeChime');
    s = enemyTurn(s);
    expect(s.enemies[0].intent!.actionId).toBe('bwEcho');
  });

  it('こだまの上限40・BREAK で半分・ブロックで防げる・毒は数えない・敵の番に受けた一撃では育たない（連鎖しない）', () => {
    let s = fight(BOSS.frostBellWraith, ['frozenSoldier', 'iceSwordsman']);
    for (const e of s.enemies.slice(1)) e.hp = e.maxHp = 99999;
    s = enterPhase(s);
    s.enemies[0].hp = 99999;
    s.enemies[0].maxHp = 199999;
    s = use(s, 'sc3bHuge', s.enemies[0].uid).state;
    expect(s.enemies[0].echoMax!).toBeGreaterThan(40);
    expect((intentView(s, s.enemies[0])!.parts[0] as { damage: number }).damage).toBe(40);
    // 毒は数えない（dealDamage を通らない）
    const before = s.enemies[0].echoMax;
    loseHp(s, s.enemies[0], 200, createRng(1), []);
    expect(s.enemies[0].echoMax).toBe(before);
    // 聖の弱点で BREAK → 半分
    const broke = use(s, 'sc3bHoly', s.enemies[0].uid, 0, 1).state;
    expect(broke.enemies[0].broken).toBe(true);
    expect((intentView(broke, broke.enemies[0])!.parts[0] as { damage: number }).damage).toBe(20);
    // ブロック15で受けると5だけ
    broke.allies[0].block = 15;
    const r = enemyEvents(broke);
    expect(hurt(r.events, broke.allies[0].id, broke.enemies[0].uid)).toBe(5);
    // 敵の番の間に味方が亡霊を殴っても（反撃など）、こだまは育たない
    const t = structuredClone(s);
    t.phase = 'enemy';
    t.enemies[0].echoMax = 3;
    dealDamage(makeCtx(t, createRng(1), [], t.allies[0], { attacker: t.enemies[0] }), t.enemies[0], 30);
    expect(t.enemies[0].echoMax).toBe(3);
  });
});

// ---------- 灯を喰らう影 ----------

describe('灯を喰らう影: 順番なし・灯を啜る・灯喰い', () => {
  it('順番が決まっていない（同じ行動は2回続かない）。予告はいつも見える', () => {
    let s = fight(BOSS.lampEaterShade, ['frozenGhoul', 'frostSprite']);
    s.enemies[0].hp = s.enemies[0].maxHp = 99999;
    const seen: string[] = [s.enemies[0].intent!.actionId];
    for (let k = 0; k < 12; k++) {
      s = enemyTurn(s);
      seen.push(s.enemies[0].intent!.actionId);
      expect(intentView(s, s.enemies[0])).toBeTruthy();
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    expect(new Set(seen).size).toBe(3);
  });

  it('灯を啜る: HPに通った分だけ回復（最大14）。ブロックで全部受ければ0', () => {
    const run = (block: number) => {
      const s = fight(BOSS.lampEaterShade, []);
      s.enemies[0].hp = 50;
      s.enemies[0].intent = { actionId: 'leSip', targetId: s.allies[0].id };
      s.allies[0].block = block;
      const r = enemyEvents(s);
      return { healed: r.state.enemies[0].hp - 50, lost: hurt(r.events, s.allies[0].id, s.enemies[0].uid) };
    };
    const open = run(0);
    expect(open.lost).toBeGreaterThan(0);
    expect(open.healed).toBe(Math.min(14, open.lost));
    expect(run(999).healed).toBe(0);
  });

  it('灯喰い: 開幕の一手の予告から数える。フォーカス1つにつき+1（最大6）・攻撃+2（予告にも反映）。BREAK で0に戻る', () => {
    let s = fight(BOSS.lampEaterShade, ['frozenGhoul', 'frostSprite']);
    for (const e of s.enemies.slice(1)) e.hp = e.maxHp = 99999;
    // 段階の前は数えない
    s = use(s, 'sc3bFocus', s.enemies[0].uid, 0, 2).state;
    expect(s.enemies[0].lampEaten).toBeUndefined();
    s = enterPhase(s);
    s.enemies[0].hp = 99999;
    s.enemies[0].maxHp = 199999;
    expect(s.enemies[0].intent!.actionId).toBe('leReach');
    expect(focusFeedOf(s.enemies[0])).toEqual({ per: 2, max: 6 });
    s.allies[0].focus = 5;
    s = use(s, 'sc3bFocus', s.enemies[0].uid, 0, 2).state;
    expect(s.enemies[0].lampEaten).toBe(2);
    expect(lampBonus(s.enemies[0])).toBe(4);
    expect(intentView(s, s.enemies[0])!.details.join('')).toContain('喰った灯 2/6');
    // 予告の数字にも足す（全員に闇6 → 6+4）
    const a0 = s.allies[0];
    expect(intentHitsOn(s.enemies[0], a0)[0]).toBe(enemyHitDamage(s.enemies[0], 10, a0));
    s.allies[0].focus = 5;
    s = use(s, 'sc3bFocus', s.enemies[0].uid, 0, 3).state;
    s.allies[0].focus = 5;
    s = use(s, 'sc3bFocus', s.enemies[0].uid, 0, 3).state;
    expect(s.enemies[0].lampEaten).toBe(6);
    // 実際の攻撃にも足す
    for (const a of s.allies) a.block = 0;
    const r = enemyEvents(s);
    expect(hurt(r.events, s.allies[0].id, s.enemies[0].uid)).toBe(enemyHitDamage(s.enemies[0], 6 + 12, s.allies[0]));
    // BREAK で0
    let t = r.state;
    t.enemies[0].intent = { actionId: 'leGreatJaw', targetId: t.allies[0].id };
    t.allies[0].focus = 5;
    t = use(t, 'sc3bHoly', t.enemies[0].uid, 0, 1).state;
    expect(t.enemies[0].broken).toBe(true);
    expect(t.enemies[0].lampEaten).toBe(0);
    expect(t.log.some((l) => l.text.includes('喰った灯が0に戻った'))).toBe(true);
  });
});

// ---------- 氷の剣士の「最後の中ボスだけの段階」 ----------

describe('直し: 災厄の戦闘の手下は、最後の中ボスだけの段階を使わない', () => {
  it('災厄の戦闘の氷の剣士は段階を持たない。最後の中ボスの部屋の戦闘では今までどおり', () => {
    const s = fight(BOSS.frostBellWraith, ['frozenSoldier', 'iceSwordsman']);
    expect(s.enemies[2].defId).toBe('iceSwordsman');
    expect(s.enemies[2].phaseSet).toBeUndefined();
    const mid = createBattle({ seed: 3, party: party('warrior'), encounter: { id: 'm', name: '中ボス', enemies: [{ defId: 'frostGuardian' }, { defId: 'iceSwordsman' }], midboss: true } });
    expect(mid.enemies[1].phaseSet).toBe('midboss');
    // 災厄の戦闘で剣士をHP50%以下にしても、溜め（霜刃を納める）は出ない
    let t = fight(BOSS.frostBellWraith, ['frozenSoldier', 'iceSwordsman']);
    t.enemies[0].hp = t.enemies[0].maxHp = 99999;
    loseHp(t, t.enemies[2], Math.ceil(t.enemies[2].maxHp * 0.6), createRng(1), []);
    for (let k = 0; k < 4; k++) {
      t = enemyTurn(t);
      expect(t.enemies[2].intent?.actionId).not.toBe('isSheathe');
    }
  });

  it('ゲームの災厄の戦闘は、戦闘の始めに災厄の印が付く（中ボスの扱いのまま）', () => {
    let g = withScourge(frozenGame(5, 1), 'frostBellWraith');
    g = fightScourge(g);
    g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0'] });
    expect(g.battle!.midboss).toBe(true);
    const sw = g.battle!.enemies.find((e) => e.defId === 'iceSwordsman');
    expect(sw?.phaseSet).toBeUndefined();
  });
});

// ---------- bot・オンライン・保存して再開 ----------

/** bot（工夫する bot）で戦闘を最後まで進める。止まらない事（手の数の上限） */
function botFight(s: BattleState, limit = 3000): BattleState {
  for (let k = 0; k < limit; k++) {
    if (s.phase === 'victory' || s.phase === 'defeat' || s.phase === 'escaped') return s;
    if (s.phase === 'enemy') {
      s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
      continue;
    }
    const cmd = cleverBattleCommand(s);
    if (cmd) {
      const r = applyCommand(s, cmd);
      expect(r.error).toBeUndefined();
      s = r.state;
      continue;
    }
    const who = s.allies.find((a) => !a.dead && !(s.ready ?? []).includes(a.playerId))!.playerId;
    s = applyCommand(s, { type: 'END_TURN', playerId: who }).state;
  }
  throw new Error('戦闘が終わらない');
}

describe('bot・オンライン・保存して再開', () => {
  const minions = { whiteWolfKing: ['frostWolf', 'frostWolf', 'emberFrostWolf'], frostBellWraith: ['frozenSoldier', 'iceSwordsman', 'frozenSoldier'], lampEaterShade: ['frozenGhoul', 'frostSprite', 'frozenGhoul'] } as const;
  it.each([1, 2, 4])('%i人: 3体とも、bot の戦闘は止まらずに終わる。強い味方なら勝てる（段階も通る）', (n) => {
    for (const id of IDS) {
      for (const seed of [1, 2]) {
        const s = fight(BOSS[id], minions[id].slice(0, n >= 4 ? 3 : 2), n, seed);
        // 手札は今のパーティの山札のまま（戦闘の始めの手札）。強い味方 = HP を多めにする
        for (const a of s.allies) {
          a.hp = a.maxHp = 3000;
          a.mana = 3;
        }
        const end = botFight(s);
        expect(end.phase, `${id} ${n}人 種${seed}`).toBe('victory');
        expect(end.enemies[0].phase, id).toBe(1);
      }
    }
  });

  it('オンライン（準備完了の待ち合わせ）: 2人とも押すまで敵の番にならない。保存（JSON）をはさんでも同じ結果', () => {
    for (const id of IDS) {
      const members = party('warrior', 'priest').map((m, i) => ({ ...m, playerId: `P${i + 1}` as PlayerId }));
      const s0 = createBattle({ seed: 9, party: members, encounter: { id: 'o', name: '災厄', enemies: [BOSS[id], ...minions[id].slice(0, 2)].map((defId) => ({ defId, level: 7 })), midboss: true, scourge: true }, readyCheck: true });
      for (const a of s0.allies) a.hp = a.maxHp = 3000;
      const r1 = applyCommand(s0, { type: 'END_TURN', playerId: 'P1' });
      expect(r1.state.phase).toBe('ally');
      const r2 = applyCommand(r1.state, { type: 'END_TURN', playerId: 'P2' });
      expect(r2.state.phase).toBe('enemy');
      const a = botFight(structuredClone(s0));
      const b = botFight(JSON.parse(JSON.stringify(s0)));
      expect(b).toEqual(a);
      // 途中で保存して再開
      let c = structuredClone(s0);
      for (let k = 0; k < 40 && c.phase !== 'victory' && c.phase !== 'defeat'; k++) {
        const cmd = c.phase === 'enemy' ? ({ type: 'ENEMY_STEP' } as Command) : cleverBattleCommand(c) ?? ({ type: 'END_TURN', playerId: c.allies.find((x) => !x.dead && !(c.ready ?? []).includes(x.playerId))!.playerId } as Command);
        c = JSON.parse(JSON.stringify(applyCommand(c, cmd).state));
      }
      expect(botFight(c)).toEqual(a);
    }
  });
});

// ---------- シナリオ2の冒険 ----------

const eventIds = EVENTS.forScenario(FK).filter((e) => e.where !== 'map' && e.where !== 'spawn').map((e) => e.id);
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
function frozenGame(seed: number, n = 2, classes = ['warrior', 'priest', 'mage', 'thief']): GameState {
  let g = createGame({ seed, scenarioId: FK, difficulty: 'normal', party: classes.slice(0, n).map((classId, i) => ({ classId, gender: 'male' as const, name: `h${i}`, playerId: `P${i + 1}` as PlayerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  return g;
}
function endTurn(g: GameState): GameState {
  const start = g.world!.worldTurn;
  for (let k = 0; k < 10 && g.world!.worldTurn === start && g.mode === 'world'; k++) {
    if (g.world!.story) g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const h = g.heroes.find((x) => x.id === g.world!.turn)!;
    g = run(g, { type: 'WORLD_WAIT', playerId: h.playerId, heroId: h.id });
  }
  return g;
}
/** 節目を越えて、災厄を3体まで出す */
function spawnAll(g: GameState): GameState {
  g.world!.keys = ['k1'];
  g = endTurn(g);
  g.world!.corruption = 40;
  g = endTurn(g);
  g.world!.corruption = 60;
  g = endTurn(g);
  g = endTurn(g);
  if (g.world!.story) g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  return g;
}
function withScourge(g: GameState, id: string): GameState {
  const t = structuredClone(g);
  const w = t.world!;
  w.scourgesMet = scourgesFor(FK).map((d) => d.id).filter((x) => x !== id);
  const wd = spawnScourge(t, w, createRng(3));
  expect(wd?.scourge).toBe(id);
  w.story = undefined;
  return t;
}
function fightScourge(g: GameState, heroes: string[] = ['h0']): GameState {
  const w = g.world!;
  const s = aliveScourges(w)[0];
  const next = w.tiles.findIndex((t, i) => !t.f && TERRAINS.get(t.t).moveCost > 0 && hexDistance(w, i, s.wd.tile) === 1 && !w.wanderers.some((x) => x.tile === i));
  for (const id of heroes) w.pos[id] = next;
  w.turn = heroes[0];
  w.move = 3;
  w.moveDice = undefined;
  w.prevTile = next;
  w.tiles[s.wd.tile].seen = true;
  const owner = g.heroes.find((h) => h.id === heroes[0])!.playerId;
  g = run(g, { type: 'WORLD_MOVE', playerId: owner, heroId: heroes[0], to: s.wd.tile, companions: heroes.slice(1).filter((id) => g.heroes.find((h) => h.id === id)!.playerId === owner) });
  expect(g.mode).toBe('encounter');
  return g;
}
function win(g: GameState): GameState {
  const b = g.battle!;
  for (const e of b.enemies) (e.dead = true), (e.hp = 0);
  b.phase = 'victory';
  return run(g, { type: 'FINISH_BATTLE', playerId: 'P1' });
}

describe('シナリオ2の冒険: 災厄3体・悪さと加護・専用の装備', () => {
  it('種12個: 4体から3体（同じ種類は出ない）。悪さが付き、鍵のダンジョンのボス戦に加護。倒すと悪さが消え、専用の装備が必ず落ちる', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      let g = spawnAll(frozenGame(seed));
      const alive = aliveScourges(g.world).map((x) => x.def.id);
      expect(alive.length, `seed ${seed}`).toBe(3);
      expect(new Set(alive).size).toBe(3);
      for (const id of alive) seen.add(id);
      for (const id of alive) expect(scourgesFor(FK).map((d) => d.id)).toContain(id);
      // 悪さ（生きている災厄の分）
      const curse = scourgeCurse(g);
      if (alive.includes('whiteWolfKing')) expect(curse.coldMul).toBe(2);
      if (alive.includes('frostBellWraith')) expect(curse.buryRoad).toBe(true);
      if (alive.includes('lampEaterShade')) expect(curse.visionDown).toBe(1);
      // 加護: 鍵のダンジョンのボス戦
      const t = structuredClone(g);
      const key = DUNGEONS.forScenario(FK).find((d) => d.rewardKey && !d.random)!;
      t.dungeon = buildDungeon(key.id, createRng(7), 0, eventIds);
      t.party = t.heroes.map((h) => h.id);
      startBattleWith(t, key.pools.boss.map((defId) => ({ defId, level: key.baseLevel + 2 })), 'boss', createRng(11));
      expect(t.battle!.boon?.ids.sort()).toEqual([...alive].sort());
      // 1体倒す
      const first = aliveScourges(g.world)[0].def;
      g = fightScourge(g);
      g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0'] });
      expect(g.battle!.enemies[0].defId).toBe(first.boss);
      g = win(g);
      expect(aliveScourges(g.world).map((x) => x.def.id)).not.toContain(first.id);
      expect(JSON.stringify(g.reward ?? g.heroes)).toContain(first.gear);
      const after = scourgeCurse(g);
      if (first.id === 'whiteWolfKing') expect(after.coldMul).toBe(1);
      if (first.id === 'frostBellWraith') expect(after.buryRoad).toBe(false);
      if (first.id === 'lampEaterShade') expect(after.visionDown).toBe(0);
    }
    expect(seen.size).toBe(4);
  }, 120000);

  it('錫杖を使えるジョブがいないパーティには「灯を喰らう影」は出ない。その時も残りの3体が出て止まらない', () => {
    const noScepter = ['warrior', 'thief'];
    const g0 = frozenGame(3, 2, noScepter);
    expect(scourgeFits(g0.heroes, SCOURGES.get('lampEaterShade'))).toBe(false);
    for (let seed = 1; seed <= 6; seed++) {
      const g = spawnAll(frozenGame(seed, 2, noScepter));
      const alive = aliveScourges(g.world).map((x) => x.def.id);
      expect(alive).not.toContain('lampEaterShade');
      expect(alive.length).toBe(3);
    }
  }, 60000);

  it('専用の装備の切り替え: 広い地図のシナリオ2では3つの伝説品が宝箱・店などから外れる。古い 8×35 では今までどおり。シナリオ1は何も外れない', () => {
    const g = frozenGame(5);
    expect([...scourgeHeldGear(g)].sort()).toEqual(['everIceBracer', 'springWaitCloak', 'springbringerScepter']);
    const old = structuredClone(g);
    old.world!.width = 8;
    old.world!.height = 35;
    expect(scourgeHeldGear(old).size).toBe(0);
    const ck = createGame({ seed: 5, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'priest', gender: 'male', name: 'a', playerId: 'P1' }] });
    expect(scourgeHeldGear(ck).size).toBe(0);
    for (const id of ['springWaitCloak', 'everIceBracer', 'springbringerScepter']) expect(getItem(id).scourgeGear).toBeTruthy();
  });

  it('保存して再開しても、災厄の出方・戦闘は同じ', () => {
    const a = spawnAll(frozenGame(7));
    const b = spawnAll(JSON.parse(JSON.stringify(frozenGame(7))));
    expect(aliveScourges(b.world).map((x) => `${x.def.id}@${x.wd.tile}`)).toEqual(aliveScourges(a.world).map((x) => `${x.def.id}@${x.wd.tile}`));
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });
});

// ---------- 見破りの文: 氷漬けの宝物庫 ----------

describe('寄り道の手がかり: テーマ「氷漬けの宝物庫」の中身', () => {
  it('ランダムダンジョンのマスの説明に、凍え・焚き火・奥の箱の決まりが出る（ほかのテーマには出ない）', () => {
    const g = frozenGame(5);
    const w = g.world!;
    const tiles = w.tiles.flatMap((t, i) => (t.f?.kind === 'dungeon' && DUNGEONS.tryGet(t.f.id)?.random ? [i] : []));
    expect(tiles.length).toBeGreaterThan(0);
    const tile = tiles[0];
    w.tiles[tile].f!.theme = 'frozenVault';
    const lines = dungeonDetourLines(g, tile);
    const line = lines.find((l) => l.startsWith('🧊凍え'));
    expect(line).toBeTruthy();
    expect(line).toContain('焚き火');
    expect(line).toContain('凍え4以上で黄金箱');
    expect(line).toContain('少ないと鉄箱');
    w.tiles[tile].f!.theme = 'crystalGrotto';
    expect(dungeonDetourLines(g, tile).some((l) => l.startsWith('🧊'))).toBe(false);
  });

  it('灯火のランタンの説明に「闇の帳を見通す」', () => {
    expect(getItem('lampLantern').description).toContain('闇の帳を見通す');
  });
});

// incomingDamage を使う所（画面の「受ける予定」）も、群れの牙の回数を数える
describe('受けるダメージの見込み', () => {
  it('群れの牙の回数（生きている敵の数）を数える', () => {
    const s = fight(BOSS.whiteWolfKing, ['frostWolf', 'frostWolf']);
    const t = s.allies.find((a) => a.id === s.enemies[0].intent!.targetId)!;
    const one = enemyHitDamage(s.enemies[0], 6, t);
    expect(incomingDamage(s, t)).toBeGreaterThanOrEqual(one * 3);
  });
});
