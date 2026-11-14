import { cardTargets, isAllyCard, needsCardTarget, selectedCardTarget, secondaryCardTarget } from './targets';
// ===== 戦闘エンジン（Reactに依存しない純粋関数） =====
// applyCommand(state, command) => { state, events }
// 入力の state は変更しない（内部で複製してから書き換える）。
// 効果の中身は effects/、特殊能力は ../abilities、状態異常は statuses.ts。ここは戦闘の流れだけを書く。

import { BALANCE } from '../../data/balance';
import { cardOf } from '../../data/cards';
import { CLASSES, getClass } from '../../data/classes';
import { getEnemy, getEnemyAction } from '../../data/enemies';
import { getStatus } from '../../data/statuses';
import type {
  AllyState,
  BattleEvent,
  BattleSetup,
  BattleState,
  CardDef,
  CardInstance,
  Command,
  CommandResult,
  EnemyActionDef,
  EnemyState,
  PlayerId,
  SlotResult,
  Statuses,
} from '../../types';
import { cardChanceBonus, cardCostOf, cardModifier, cardTraitAbilities, carryManaOf, extraHitsOf, petActOnce, completeSlotsOf, damageModifiers, fireAbilities, keepBlockOf, markCostUsed, rigDiceOf, shareBlockOf, summonTwiceOf } from '../abilities';
import { createRng, type Rng, shuffle } from '../rng';
import { affinityOf } from '../stats';
import { calcDamage } from './damage';
import { discardHand, drawCards, reshuffleBlockedText } from './deck';
import { applyEffect, checkEffect, comboMultiplier, dealDamage, elementMultiplier, makeCtx, targetOf } from './effects';
import { blockSkippedOnBreak, breakStopsAction, decideAllIntents, fallbackUselessIntent } from './intents';
import { finalChance, selectTier } from './probability';
import { helpedAllies, recordSupport, selfSnapshot, supportSnapshot } from './support';
import { afterAttackCard, attackElement, consumeAttackCharge, cardElements, cardHpCost, chargedMultiplier, tierHpCost } from './cardState';
import { slotPreviewLimitOf } from './preview';
import { allyHasWeakCard } from './breakRules';
import { isStrikingSummon, summonDamageOf, summonStrikeOnce } from './summons';
import { activeStatuses, actionFailChanceOf, applyTick, chancePenaltyOf, consumeStatus, decayStatuses, emptyStatuses, skipActionStatus, takeDrawPenalty, takeManaPenalty, tickHealOf } from './statuses';
import { abilityTriggered, addLog, enemyName, findAlly, healUnit, loseHp, nameOf, unitIdOf } from './units';

export { enemyName, findAlly, findEnemy, unitName } from './units';

// v18（2026-11-11）: 鎧・装飾品の作り直し。古い保存データは読まない（オーナーの決定。v17 からの移行は作らない）
// v21（2026-11-12）: 区切りD-1 同じ中身のカードをまとめた。古い保存は読まない
// v22（2026-11-12）: 区切りD-2〜D-4 軸のカード・決め技・武器のカードの付け替え。古い保存は読まない
// v23（2026-11-12）: 区切りE 消耗品 50→24。古い保存は読まない
// v26（2026-11-12）: 区切りG-2 魔法の法衣・鋼の連撃を無くした。古い保存は読み替える（engine/game/migrations.ts の 25）
export const STATE_VERSION = 26;
export { slotPreviewLimitOf } from './preview';

// ---------- 生成 ----------

import { enemyLevelFactors } from './levels';
export { enemyLevelFactors };

/**
 * 決め技（どれかの職の jobCards の札）を、切った山札のいちばん上に置く（2026-11-14 宿題6A）。
 * 決め技を持っている人は、戦闘の最初の手札に決め技が必ず1枚来る（山札から引く形。手札の枚数は変えない）。
 * 乱数は使わない（切った後の並びで、最初の決め技といちばん上の札を入れ替えるだけ）ので、乱数の順は崩れない。
 */
function finisherOnTop(pile: CardInstance[]): CardInstance[] {
  const fin = new Set(CLASSES.all.flatMap((j) => j.jobCards ?? []));
  const i = pile.findIndex((c) => fin.has(c.cardId));
  if (i > 0) [pile[0], pile[i]] = [pile[i], pile[0]];
  return pile;
}

export function createBattle(setup: BattleSetup): BattleState {
  const { seed, party, encounter } = setup;
  if (party.length < 1 || party.length > BALANCE.maxPartySize) throw new Error(`party size must be 1..${BALANCE.maxPartySize}`);
  if (encounter.enemies.length < 1 || encounter.enemies.length > BALANCE.maxEnemies)
    throw new Error(`enemy count must be 1..${BALANCE.maxEnemies}`);

  const rng = createRng(seed);
  let uid = 1;
  const allies: AllyState[] = party.map((m, i) => {
    const def = getClass(m.classId);
    const cards: CardInstance[] = m.deck
      ? m.deck.map((c) => ({ ...c }))
      : def.deck.flatMap((d) => Array.from({ length: d.count }, () => ({ uid: `c${uid++}`, cardId: d.cardId })));
    for (const c of cards) cardOf(c); // 存在チェック
    const maxHp = m.maxHp ?? def.baseMaxHp;
    return {
      id: m.heroId ?? `a${i}`,
      classId: def.id,
      gender: m.gender,
      name: m.name,
      playerId: m.playerId,
      level: m.level ?? 1,
      hp: Math.min(maxHp, m.hp ?? maxHp),
      maxHp,
      block: 0,
      slotPreviewUsed: 0,
      mana: 0,
      focus: m.focus ?? BALANCE.focusStart,
      focusMax: m.focusMax ?? BALANCE.focusMax,
      stats: m.stats ?? def.stats,
      extraDraw: m.extraDraw ?? 0,
      ...(m.gold ? { gold: m.gold } : {}),
      ...(m.abilities?.length ? { abilities: structuredClone(m.abilities) } : {}),
      ...(m.pet ? { pet: { ...m.pet } } : {}),
      ...(m.weaponElement ? { weaponElement: m.weaponElement } : {}),
      ...(m.equippedWeaponType ? { equippedWeaponType: m.equippedWeaponType } : {}),
      statuses: { ...emptyStatuses(), ...(m.statuses as Statuses) },
      drawPile: finisherOnTop(shuffle(cards, rng)),
      hand: [],
      discard: [],
      dead: (m.hp ?? maxHp) <= 0,
    };
  });

  const partyMul = BALANCE.enemyHpByPartySize[party.length] ?? 1;
  // 同じ敵が複数いる時は A, B, ... を付ける
  const counts = new Map<string, number>();
  for (const e of encounter.enemies) counts.set(e.defId, (counts.get(e.defId) ?? 0) + 1);
  const seen = new Map<string, number>();
  const enemies: EnemyState[] = encounter.enemies.map((spec, i) => {
    const def = getEnemy(spec.defId);
    const level = spec.level ?? def.baseLevel;
    const f = enemyLevelFactors(def, level);
    // 強敵の本体（強敵の戦闘で、強敵の組から来た敵）だけ、HPに eliteBodyHpMul を掛ける（2026-11-13 強敵の計画 柱2）
    const body = !!encounter.elite && !encounter.boss && !encounter.midboss && !!spec.eliteBody;
    const hp = Math.max(1, Math.floor(def.maxHp * f.hp * partyMul * (setup.enemyHpMul ?? 1) * (body ? (setup.eliteBodyHpMul ?? 1) : 1) + 1e-9));
    const n = seen.get(spec.defId) ?? 0;
    seen.set(spec.defId, n + 1);
    return {
      uid: `e${i}`,
      defId: spec.defId,
      nameSuffix: (counts.get(spec.defId) ?? 0) > 1 ? String.fromCharCode(65 + n) : undefined,
      level,
      attackMul: f.attack * (setup.enemyAttackMul ?? 1),
      hp,
      maxHp: hp,
      block: 0,
      statuses: emptyStatuses(),
      seqIndex: 0,
      history: [],
      dead: false,
      phase: 0,
      ...(body ? { eliteBody: true } : {}),
      // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけ、中ボスの段階（midbossPhases）を読む
      ...(encounter.midboss && def.midbossPhases?.length ? { phaseSet: 'midboss' as const } : {}),
    };
  });

  const state: BattleState = {
    version: STATE_VERSION,
    seed,
    rngState: 0,
    turn: 0,
    phase: 'ally',
    allies,
    enemies,
    enemyCursor: 0,
    stats: { totalDamage: 0, maxDamage: 0, perfects: 0, focusUsed: 0, abilityTriggers: 0 },
    log: [],
    nextLogId: 1,
    nextUid: uid,
    encounterId: encounter.id,
    ...(encounter.boss ? { boss: true } : {}),
    ...(encounter.midboss ? { midboss: true } : {}),
    ...(encounter.elite ? { elite: true } : {}),
    ...(encounter.firstKeyBoss ? { firstKeyBoss: true } : {}),
    ...(setup.readyCheck ? { readyCheck: true, ready: [] } : {}),
  };
  addLog(state, `戦闘開始（${party.length}人 / ${encounter.name}）`);
  decideAllIntents(state, rng);
  // 奇襲成功: 敵は最初のターンに行動しない（インテントを出さない）
  if (setup.surprise) {
    for (const e of state.enemies) e.intent = undefined;
    addLog(state, '奇襲成功！ 敵は最初のターンに動けない');
  }
  const openingEvents: BattleEvent[] = [];
  startAllyPhase(state, rng, openingEvents);
  // 装備による戦闘開始時のブロック（味方フェーズ開始のリセットの後に入れる）
  party.forEach((m, i) => {
    if (m.startBlock && !allies[i].dead) allies[i].block += m.startBlock;
  });
  // きっかけ: 戦闘開始時
  for (const u of [...state.allies, ...state.enemies]) if (!u.dead) fireAbilities(state, rng, openingEvents, u, 'battleStart');
  // 区切りE: お供の特上ごちそう — 1ターン目にお供が何回も行動する（お供の行動の上限の中で）
  party.forEach((m, i) => {
    for (let k = 0; k < (m.petFeast ?? 0); k++) if (!allies[i].dead && allies[i].pet) petActOnce(state, rng, openingEvents, allies[i]);
  });
  state.openingEvents = openingEvents;
  checkEnd(state, []);
  state.rngState = rng.state;
  return state;
}

// ---------- 参照用ヘルパー ----------

/** カードの成功率（適性・痺れなどの状態異常を反映） */
/** target・state = 狙う相手で変わる能力（崩しの矢など）を見る時に渡す */
export function chanceFor(ally: AllyState, card: CardDef, target?: AllyState | EnemyState, state?: BattleState): number {
  const bonus = cardChanceBonus(ally, card, target, state) + statusChanceBonus(ally.statuses);
  const base = bonus ? Math.min(BALANCE.chanceMax, finalChance(card, affinityOf(ally)) + bonus) : finalChance(card, affinityOf(ally));
  const pen = chancePenaltyOf(ally.statuses);
  return pen ? Math.max(BALANCE.chanceMin, base - pen) : base;
}

/** フォーカス使用後の成功率。必中の予測表示と実際の判定で共有する。 */
export function rollChanceFor(ally: AllyState, card: CardDef, focusUsed: number, target?: AllyState | EnemyState, state?: BattleState): number {
  return completeSlotsOf(state, ally, card, focusUsed, target).active ? 100 : chanceFor(ally, card, target, state);
}

/** 次のカードの成功率の上乗せ（状態異常の chanceBonus × 数） */
export function statusChanceBonus(st: Statuses): number {
  let n = 0;
  for (const [id, v] of Object.entries(st)) if (v) n += (getStatus(id).chanceBonus ?? 0) * v + (getStatus(id).flatChanceBonus ?? 0);
  return n;
}

function consumeChanceBonus(st: Statuses) {
  for (const [id, v] of Object.entries(st)) if (v && getStatus(id).chanceBonus) st[id] = 0;
}

/** カードが使えない理由（使えるなら null） */
export function unusableReason(state: BattleState, ally: AllyState, card: CardDef, uid?: string): string | null {
  if (state.slotPreview) return '星読みの結果を確定してください';
  if (state.phase !== 'ally') return '味方フェーズではありません';
  if (ally.dead) return '戦闘不能です';
  if (ally.exhaustedCards?.includes(card.id)) return 'この戦闘ではもう使いました';
  if (ally.mana < cardCostOf(state, ally, card, uid).cost) return 'マナが足りません';
  if (ally.hp <= cardHpCost(card, ally.hp)) return 'HPを払うと戦闘不能になります';
  if (needsCardTarget(card) && !cardTargets(state, ally, card).length) return '対象がいません';
  if ((card.target === 'enemy' || card.target === 'allEnemies') && !state.enemies.some((e) => !e.dead)) return '対象がいません';
  return null;
}

export function usableCardCount(state: BattleState, ally: AllyState): number {
  let n = 0;
  for (const c of ally.hand) if (unusableReason(state, ally, cardOf(c), c.uid) === null) n++;
  return n;
}

/** 行動完了（マナ切れ・使えるカードなし・戦闘不能） */
/** まだ準備完了していないプレイヤー（オンライン協力。生きているキャラの担当だけ） */
export function waitingPlayers(state: BattleState): PlayerId[] {
  if (!state.readyCheck || state.phase !== 'ally') return [];
  const need = [...new Set(state.allies.filter((a) => !a.dead).map((a) => a.playerId))];
  return need.filter((p) => !(state.ready ?? []).includes(p));
}

export function isDone(state: BattleState, ally: AllyState): boolean {
  return ally.dead || usableCardCount(state, ally) === 0;
}

/** カードのダメージ効果が対象に与える実際の値（Tierごとの合計。特殊能力の倍率・状態異常も反映） */
export function tierDamageAgainst(ally: AllyState, card: CardDef, target: EnemyState): number[] {
  return card.tiers.map((t) => {
    const source = { ...ally, hp: ally.hp - tierHpCost(t, ally.hp) };
    let onceUsed = false;
    return t.effects.reduce((sum, e) => {
      if (e.kind !== 'damage' || (targetOf(e) !== 'target' && targetOf(e) !== 'foes')) return sum;
      const element = attackElement(source, card, e.element);
      const { multiplier, add, addOnce } = damageModifiers(undefined, source, card, target, cardTraitAbilities(card), t.minSuccesses === card.slots, element);
      // 「最初の1回の攻撃にだけ足すダメージ」（弾込め）は、その段の最初の1回分だけ足す
      const first = addOnce && !onceUsed ? calcDamage(e.amount + add + addOnce, source.statuses, target.statuses, chargedMultiplier(source, card) * multiplier * elementMultiplier(target, element) * comboMultiplier(source, target)) - calcDamage(e.amount + add, source.statuses, target.statuses, chargedMultiplier(source, card) * multiplier * elementMultiplier(target, element) * comboMultiplier(source, target)) : 0;
      if (addOnce) onceUsed = true;
      return sum + first + calcDamage(e.amount + add, source.statuses, target.statuses, chargedMultiplier(source, card) * (e.outcomes?.length ? e.outcomes.reduce((n, o) => n + o.weight * o.multiplier, 0) / e.outcomes.reduce((n, o) => n + o.weight, 0) : 1) * multiplier * elementMultiplier(target, element) * comboMultiplier(source, target)) * ((e.hits ?? 1) + ((e.hits ?? 1) >= 2 ? extraHitsOf(source) : 0));
    }, 0);
  });
}

const SLOT_ICON: Record<SlotResult, string> = { focus: '🌟', hit: '⭕', miss: '❌' };

// ---------- フェーズ ----------

function startAllyPhase(state: BattleState, rng: Rng, events: BattleEvent[]) {
  state.turn += 1;
  state.phase = 'ally';
  // 区切りD: 血の代価の数え（このターンに失ったHP）は、自分たちの番の始めから数え直す（元の文どおり）
  for (const a of state.allies) if (a.counters?.hpLostTurn) a.counters.hpLostTurn = 0;
  // 連携攻撃の記録と、狙いの表示は、ターンごとに消す
  state.aims = {};
  for (const e of state.enemies) {
    e.hitBy = [];
    // BREAK の数えも、ターンごとに消す（予告は敵フェーズの終わりに決め直している）
    delete e.turnDamage;
    delete e.broken;
    // 区切りD: このターンの印（弱点看破・挟撃の陣）
    delete e.exposed;
    delete e.tempWeak;
    delete e.pincer;
    delete e.pincerFocus;
  }
  for (const a of state.allies) {
    a.played = 0;
    a.playedZero = 0;
    a.playedAttack = 0;
    a.playedBy = {};
  }
  for (const a of state.allies) {
    if (a.dead) continue;
    // 不動の錨など: 前のターンのブロックが、上限まで残る
    // 装備の能力の数え: 前のターンから残ったブロック（守りの祈り）・敵の番を無傷でしのいだか（返しの穂先・竜王の構え）
    const cs = (a.counters ??= {});
    cs.blockLeft = a.block;
    // 区切りD: このターンだけの印・期間の過ぎたカードの能力を消す（ブロックの持ち越しを決める前。不落の城塞は1ターン残る）
    delete a.guided;
    delete a.comboBoost;
    delete a.reversal;
    delete a.extraHits;
    if (cs.bloodAdd) cs.bloodAdd = 0;
    if (a.abilities?.some((ab) => ab.untilTurn !== undefined && ab.untilTurn < state.turn)) a.abilities = a.abilities.filter((ab) => ab.untilTurn === undefined || ab.untilTurn >= state.turn);
    // 区切りD: 不動の拳 — 前の敵の番に受けた攻撃の量を、このターンの最初の物理カードに足す数にする
    if (cs.fudoOn) { cs.fudo = Math.min(cs.fudoMax ?? 12, Math.floor(((cs.fudoStore ?? 0) * (cs.fudoPct ?? 50)) / 100)); delete cs.fudoOn; delete cs.fudoStore; }
    else cs.fudo = 0;
    // 区切りF: 返し突き — 前の敵の番に防いだ量の半分（最大15）
    cs.returnPower = Math.min(15, Math.floor((cs.blockedPhase ?? 0) / 2));
    cs.blockedPhase = 0;
    // お供の行動の数え（1ターンに4回まで）
    cs.petActsTurn = 0;
    cs.unhurtTurn = state.turn > 1 && cs.unhurt === 1 ? 1 : 0;
    a.block = Math.min(a.block, keepBlockOf(a));
    // 段階7a: 過充填の魔導炉 — 使わずに残ったマナを、上限まで持ち越す（1ターン目は残りが0）
    const carry = Math.min(carryManaOf(a), Math.max(0, a.mana));
    a.mana = BALANCE.manaPerTurn + carry;
    if (carry > 0) addLog(state, `${a.name}は残ったマナを${carry}持ち越した`);
    // きっかけ: ターン開始時のうち、凍結・遅延の罰を受ける前（雪解けの指輪。点検 2026-11-13 F5）
    fireAbilities(state, rng, events, a, 'turnStartBefore');
    // 凍結など: マナが減る（効いたら1減る）
    const pen = takeManaPenalty(a.statuses);
    if (pen.amount) {
      a.mana = Math.max(0, a.mana - pen.amount);
      addLog(state, `${a.name}は${pen.names.join('・')}でマナ-${pen.amount}`);
    }
    // 遅延など: 引くカードが減る（効いたら消える）
    const slow = takeDrawPenalty(a.statuses);
    if (slow.amount) addLog(state, `${a.name}は${slow.names.join('・')}で引くカード-${slow.amount}`);
    const { reshuffled, blocked } = drawCards(a, Math.max(0, BALANCE.drawPerTurn + a.extraDraw - slow.amount), rng, state.turn);
    if (reshuffled) addLog(state, `${a.name}: 捨札をシャッフルして山札に戻した`);
    if (blocked) addLog(state, reshuffleBlockedText(a.name));
  }
  for (const a of state.allies) if (!a.dead) applyTickHeal(state, a, events);
  for (const a of state.allies) {
    if (a.dead || !a.airborne || a.airborne.turn > state.turn) continue;
    const jump = a.airborne;
    delete a.airborne;
    const target = state.enemies.find(e => e.uid === jump.targetId && !e.dead) ?? state.enemies.find(e => !e.dead);
    if (target) dealDamage(makeCtx(state, rng, events, a), target, jump.amount);
  }
  // きっかけ: ターン開始時（ブロックのリセットの後）
  for (const a of state.allies) if (!a.dead) fireAbilities(state, rng, events, a, 'turnStart');
  events.push({ type: 'phase', phase: 'ally' });
}

function checkEnd(state: BattleState, events: BattleEvent[]): boolean {
  for (const a of state.allies) a.summons = a.summons?.filter(s => !s.trigger || (!a.dead && state.enemies.some(e => !e.dead && e.uid === s.targetId)));
  if (state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'escaped') return true;
  if (!state.enemies.some((e) => !e.dead)) {
    state.phase = 'victory';
    addLog(state, '勝利！');
    events.push({ type: 'phase', phase: 'victory' });
    return true;
  }
  if (!state.allies.some((a) => !a.dead)) {
    state.phase = 'defeat';
    addLog(state, '全滅…');
    events.push({ type: 'phase', phase: 'defeat' });
    return true;
  }
  return false;
}

/** フェーズの始めの回復（再生など） */
function applyTickHeal(state: BattleState, u: AllyState | EnemyState, events: BattleEvent[]) {
  const { amount, names } = tickHealOf(u.statuses);
  if (amount <= 0) return;
  const h = healUnit(u, amount, events);
  if (h > 0) addLog(state, `${nameOf(u)}は${names.join('・')}でHP+${h}`);
}

/** 災厄の加護「瘴気の衣」（2026-11-14）: 大物が敵の番の始めに、最大HPの regen% を回復する（呪い・癒し封じで減る = healUnit の倍率） */
function boonRegen(state: BattleState, events: BattleEvent[]) {
  const bo = state.boon;
  if (!bo?.regen) return;
  const e = state.enemies.find((x) => x.uid === bo.uid && !x.dead);
  if (!e) return;
  const h = healUnit(e, Math.ceil((e.maxHp * bo.regen) / 100), events);
  if (h > 0) addLog(state, `💀瘴気の衣（瘴気を紡ぐ死霊術師の加護）: ${nameOf(e)}はHP+${h}`);
}

/** 継続ダメージの状態異常（毒・火傷など。ブロックを無視）→ その状態異常は減る */
function tickDamageOverTime(state: BattleState, side: 'ally' | 'enemy', rng: Rng, events: BattleEvent[]) {
  const units = side === 'ally' ? state.allies : state.enemies;
  for (const u of units) {
    if (u.dead) continue;
    const ticking = side === 'enemy' ? activeStatuses(u.statuses).filter(({ def }) => def.tickDamage !== undefined).map(({ def }) => def.id) : [];
    const { damage, names } = applyTick(u.statuses);
    if (damage <= 0) continue;
    addLog(state, `${nameOf(u)}は${names.join('・')}で${Math.min(u.hp, damage)}ダメージ`);
    loseHp(state, u, damage, rng, events);
    // きっかけ: 敵が継続ダメージ（毒など）を受けた
    for (const id of ticking) for (const a of state.allies) if (!a.dead) fireAbilities(state, rng, events, a, 'foeTick', { target: u, statusId: id });
  }
}

// ---------- コマンド処理 ----------

export function applyCommand(input: BattleState, cmd: Command): CommandResult {
  if (input.slotPreview && cmd.type !== 'REROLL_PREVIEW' && cmd.type !== 'CONFIRM_PREVIEW') return { state: input, events: [], error: '星読みの結果を確定するまで、この戦闘は待機します' };
  const state: BattleState = structuredClone(input);
  const rng = createRng(input.rngState);
  const events: BattleEvent[] = [];
  let error: string | undefined;
  switch (cmd.type) {
    case 'PREVIEW_CARD':
      error = reserveCard(state, cmd, rng);
      break;
    case 'REROLL_PREVIEW':
    case 'CONFIRM_PREVIEW': {
      const p = state.slotPreview, a = p && findAlly(state, p.characterId);
      if (!p || !a || a.dead || state.phase !== 'ally') error = '先読みしたカードがありません';
      else if (cmd.characterId !== a.id || cmd.playerId !== a.playerId) error = '先読みしたキャラの担当だけが操作できます';
      else if (cmd.type === 'REROLL_PREVIEW') {
        if (p.rerolled) error = '振り直しは1回だけです';
        else p.rerolled = true;
      } else {
        delete state.slotPreview;
        error = playCard(state, { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: p.cardInstanceId, targetId: p.targetId, allyTargetId: p.allyTargetId, focusUsed: p.focusUsed }, rng, events,
          { chance: p.chance, results: p.rerolled ? p.rerollResults : p.results });
      }
      break;
    }
    case 'PLAY_CARD':
      error = playCard(state, cmd, rng, events);
      break;
    case 'END_TURN':
      error = endTurn(state, cmd.playerId, rng, events);
      break;
    case 'ENEMY_STEP':
      error = enemyStep(state, rng, events);
      break;
    case 'USE_ITEM':
      error = useItem(state, cmd, rng, events);
      break;
    case 'AIM': {
      // 狙っている敵を仲間に見せるだけ（結果は変わらない）
      const a = state.allies.find((x) => x.id === cmd.characterId);
      if (state.phase !== 'ally' || !a || a.dead) error = '今は狙えません';
      else if (a.playerId !== cmd.playerId) error = '担当していないキャラです';
      else if (cmd.targetId && !state.enemies.some((e) => e.uid === cmd.targetId && !e.dead)) error = 'その敵は狙えません';
      else {
        state.aims ??= {};
        if (cmd.targetId) state.aims[a.id] = cmd.targetId;
        else delete state.aims[a.id];
      }
      break;
    }
    default:
      error = '不明なコマンドです';
  }
  if (error) return { state: input, events: [], error };
  state.rngState = rng.state;
  return { state, events };
}

/** スロットを振る（フォーカス枠は左に並べて確定成功） */
/** 星の導き: 失敗した枠を、前から n 個だけ成功に変える */
function fixMisses(results: SlotResult[], n?: number): SlotResult[] {
  let left = n ?? 0;
  return left ? results.map((r) => (r === 'miss' && left-- > 0 ? 'hit' : r)) : results;
}

export function rollSlots(slots: number, focusUsed: number, chance: number, rng: Rng): SlotResult[] {
  const out: SlotResult[] = [];
  for (let i = 0; i < slots; i++) {
    if (i < focusUsed) out.push('focus');
    else out.push(rng.next() < chance / 100 ? 'hit' : 'miss');
  }
  return out;
}

function reserveCard(state: BattleState, cmd: Extract<Command, { type: 'PREVIEW_CARD' }>, rng: Rng): string | undefined {
  const ally = findAlly(state, cmd.characterId);
  if (!ally || ally.playerId !== cmd.playerId) return '担当していないキャラです';
  if ((ally.slotPreviewUsed ?? 0) >= slotPreviewLimitOf(ally)) return 'この戦闘では星読みを使えません';
  const inst = ally.hand.find(c => c.uid === cmd.cardInstanceId);
  if (!inst) return '手札にありません';
  const card = cardOf(inst), reason = unusableReason(state, ally, card, inst.uid);
  if (reason) return reason;
  if (!Number.isInteger(cmd.focusUsed) || cmd.focusUsed < 0 || cmd.focusUsed > Math.min(card.slots, ally.focus)) return 'フォーカスの数が不正です';
  if (needsCardTarget(card) && !selectedCardTarget(state, ally, card, cmd.targetId)) return '対象を選んでください';
  if (card.secondaryTarget && !secondaryCardTarget(state, ally, card, cmd.allyTargetId)) return '回復・支援する味方を選んでください';
  const chance = rollChanceFor(ally, card, cmd.focusUsed, selectedCardTarget(state, ally, card, cmd.targetId), state);
  const results = fixMisses(rollSlots(card.slots, cmd.focusUsed, chance, rng), ally.fixMiss);
  const rerollResults = fixMisses(rollSlots(card.slots, cmd.focusUsed, chance, rng), ally.fixMiss);
  state.slotPreview = { allyTargetId: cmd.allyTargetId, characterId: ally.id, cardInstanceId: inst.uid, targetId: needsCardTarget(card) ? cmd.targetId : undefined, focusUsed: cmd.focusUsed, chance, results, rerollResults, rerolled: false };
  ally.slotPreviewUsed = (ally.slotPreviewUsed ?? 0) + 1;
  if (state.ready) state.ready = state.ready.filter(p => p !== ally.playerId);
  return undefined;
}

function playCard(state: BattleState, cmd: Extract<Command, { type: 'PLAY_CARD' }>, rng: Rng, events: BattleEvent[], reserved?: { chance: number; results: SlotResult[]; card?: CardDef }): string | undefined {
  const ally = findAlly(state, cmd.characterId);
  if (!ally) return 'キャラが見つかりません';
  if (ally.playerId !== cmd.playerId) return '担当していないキャラです';
  // カードを使ったら、そのプレイヤーの準備完了は取り消し
  if (state.ready) state.ready = state.ready.filter((p) => p !== cmd.playerId);
  if (state.aims) delete state.aims[ally.id];
  const idx = ally.hand.findIndex((c) => c.uid === cmd.cardInstanceId);
  if (idx < 0) return '手札にありません';
  const inst = ally.hand[idx];
  const card = reserved?.card ?? cardOf(inst);
  const reason = unusableReason(state, ally, card, inst.uid);
  if (reason) return reason;
  const focusUsed = cmd.focusUsed;
  if (!Number.isInteger(focusUsed) || focusUsed < 0 || focusUsed > Math.min(card.slots, ally.focus)) return 'フォーカスの数が不正です';

  const target = selectedCardTarget(state, ally, card, cmd.targetId);
  if (needsCardTarget(card) && !target) return '対象を選び直してください';

  const allyTarget = secondaryCardTarget(state, ally, card, cmd.allyTargetId);
  if (card.secondaryTarget && !allyTarget) return '回復・支援する味方を選び直してください';

  // 支払い
  const paid = cardCostOf(state, ally, card, inst.uid);
  ally.mana -= paid.cost;
  // 陣割りなど: 今のカードに払ったマナを覚えておく
  (ally.counters ??= {}).lastCost = paid.cost;
  markCostUsed(state, ally, paid.keys);
  for (const n of paid.active) abilityTriggered(state, ally.id, n.name, events, n.source);
  ally.focus -= focusUsed;
  ally.hand.splice(idx, 1);
  state.stats.focusUsed += focusUsed;

  // 判定
  // 天穿ちなど: 残りの枠も全部成功になる能力（1ターンに1枚の物は、ここで使った事にする。星読みで予約した時も同じ）
  const complete = completeSlotsOf(state, ally, card, focusUsed, target);
  markCostUsed(state, ally, complete.keys);
  for (const n of complete.notices) abilityTriggered(state, ally.id, n.name, events, n.source);
  const chance = reserved?.chance ?? (complete.active ? 100 : chanceFor(ally, card, target, state));
  // 星の導き: 失敗した枠を成功に変える（このカードで使い切る。先読みの結果には、もう当ててある）
  const fix = ally.fixMiss;
  delete ally.fixMiss;
  let results = reserved?.results ?? fixMisses(rollSlots(card.slots, focusUsed, chance, rng), fix);
  // 段階7a: いかさま師の黄金賽 — 成功が0なら完全成功に変える（1ターンに1回）。乱数は引かず、出た結果だけを書き換えるので、
  // 星読みで先に決めた結果（保存してある）に当てても、保存して再開しても・オンラインでも同じになる
  const rig = rigDiceOf(ally);
  if (rig && !results.some((r) => r !== 'miss') && (ally.counters ??= {})['once:rigDice'] !== state.turn) {
    ally.counters['once:rigDice'] = state.turn;
    results = results.map(() => 'hit');
    const gain = Math.min(1, ally.focusMax - ally.focus);
    if (gain > 0) {
      ally.focus += gain;
      events.push({ type: 'resource', unitId: ally.id, resource: 'focus', amount: gain });
    }
    abilityTriggered(state, ally.id, rig.name, events, rig.source);
    addLog(state, `${ally.name}の「${rig.name}」！ 失敗が完全成功に変わった${gain ? '（フォーカス+1）' : ''}`);
  }
  // 次のカードの成功率が上がる状態異常（応援など）は、使ったら消える
  // 輪唱: この応援をくれた味方を覚えておく（完全成功したら、その味方のきっかけを起こす）
  const cheerer = (ally.statuses.inspired ?? 0) > 0 && ally.cheeredBy ? findAlly(state, ally.cheeredBy) : undefined;
  delete ally.cheeredBy;
  consumeChanceBonus(ally.statuses);
  const successes = results.filter((r) => r !== 'miss').length;
  const perfect = successes === card.slots;
  if (perfect) state.stats.perfects += 1;
  // 転職の条件の記録: 使ったマナ・完全成功・カードの種類・仲間を助けるカード
  {
    const f = (ally.feats ??= {});
    const add = (k: string, n = 1) => (f[k] = (f[k] ?? 0) + n);
    add('mana', paid.cost);
    if (perfect) add('perfects');
    if (successes > 0) add(`success:${card.category}`);
    // 2026-11-14（竜騎士の条件・案A）: 戦闘の1ターン目に成功した物理カード（槍騎士の《突撃》の「最初の一撃」）。記録が無い古い保存は0から数える
    if (successes > 0 && card.category === 'physical' && state.turn === 1) add('success:physical:turn1');
    if (successes > 0 && card.tiers.some(t => t.effects.some(e => e.kind === 'heal'))) add('success:heal');
    if ((card.target === 'self' || isAllyCard(card)) && card.tiers.some((t) => t.effects.some((e) => e.kind === 'block' || e.kind === 'heal' || e.kind === 'applyStatus'))) add('support');
  }
  const tier = selectTier(card, successes);
  const supportBefore = supportSnapshot(state.allies, ally);
  const selfBefore = selfSnapshot(ally);
  // 段階7a: 狂王の血鎧 — このカードを使う前にためていた分（このカードで使い切る）
  const rageBefore = ally.counters?.rageAtkPct ?? 0;

  // 効果（効果の部品を順に使う）
  const cardAbilities = cardTraitAbilities(card);
  const ctx = makeCtx(state, rng, events, ally, { target, allyTarget, card, cardAbilities, perfect, tierEffects: tier.effects });
  ctx.successes = successes;
  // つまみの測定2（2026-11-13・測るだけ）: BREAK の決まりの入れ物が読む物。既定の値（breakPerfectNoWeakCard = false・breakPerfectHeavy なし）では読まれない
  ctx.focusUsed = focusUsed;
  if (BALANCE.breakPerfectNoWeakCard) ctx.hasWeakCard = (e) => allyHasWeakCard(ally, e);
  if (target && tier.effects.some(e => e.kind === 'damage')) ally.lastTargetId = unitIdOf(target);
  for (const eff of tier.effects) applyEffect(ctx, eff);
  consumeAttackCharge(ally, card, tier);
  const supportedOthers = recordSupport(ally, state.allies, supportBefore);
  // 支援が成立した味方（1人パーティの時は、自分への支援でも成立。伴奏・助け合いの調べ）
  const supportedSelf = helpedAllies(state.allies, selfBefore).length > 0;
  const helpedOthers = helpedAllies(state.allies, supportBefore);
  const helped = helpedOthers.length ? helpedOthers : supportedSelf && state.allies.length === 1 ? [ally] : [];
  // 装備の能力の数え: このターンに使った属性（四元）・最後に使った属性（書き分け）・攻撃カードを使ったターン（間奏）
  {
    const cs = (ally.counters ??= {});
    const els = cardElements(card);
    if (els.length) {
      for (const k of Object.keys(cs)) if (k.startsWith('elLast:')) delete cs[k];
      for (const el of els) { cs[`elLast:${el}`] = 1; cs[`elTurn:${el}`] = state.turn; }
    }
    if (card.tiers.some((t) => t.effects.some((e) => e.kind === 'damage'))) cs.atkTurn = state.turn;
  }
  // 弱点を突いた敵（最初の1体。弱点突き）
  const weakTarget = (ctx.weakHitIds ?? []).map((id) => state.enemies.find((e) => e.uid === id)).find((e) => e && !e.dead);
  const parts = ctx.parts;
  const hasDamage = tier.effects.some((e) => e.kind === 'damage');
  if (hasDamage) parts.unshift(`${ctx.dealt}ダメージ`);
  // 働いた常時型の能力（闘志・貫通・止めなど）
  for (const n of ctx.fired) abilityTriggered(state, ally.id, n.name, events, n.source);

  // きっかけ: カードの特殊能力 → 自分の能力（カードを使った後 → 完全成功時）
  const fireOpts = { card, target, allyTarget, dealt: ctx.dealt, focusUsed, tierEffects: tier.effects, perfect, successes, supportedOthers, supportedSelf, helped, weakTarget, multi: ctx.multi };
  // 発動した能力（お供・ジョブ・カードの特殊能力）の名前は、結果の帯には入れず、記録にだけ残す（帯が長くなって切れるため。
  // 能力はカットイン・キャラの上の【能力名】で見せる）
  const abilityParts: string[] = [];
  if (cardAbilities) {
    abilityParts.push(...fireAbilities(state, rng, events, ally, 'afterCard', { ...fireOpts, list: cardAbilities }));
    if (perfect) abilityParts.push(...fireAbilities(state, rng, events, ally, 'perfect', { ...fireOpts, list: cardAbilities }));
  }
  abilityParts.push(...fireAbilities(state, rng, events, ally, 'afterCard', fireOpts));
  if (perfect) abilityParts.push(...fireAbilities(state, rng, events, ally, 'perfect', fireOpts));
  // 区切りF: カードで自分が回復かブロックを得た（調教師《相棒の覚醒》）
  if (!ally.dead && (ally.hp > selfBefore[0].hp || ally.block > selfBefore[0].block)) abilityParts.push(...fireAbilities(state, rng, events, ally, 'selfBoost', fireOpts));
  // 区切りF: 転職の条件の記録 — 1ターンのうちにブロックを25以上にした（重装衛士）
  if (ally.block >= 25 && (ally.counters ??= {}).bigBlockTurn !== state.turn) { ally.counters.bigBlockTurn = state.turn; const f = (ally.feats ??= {}); f.blockTurns25 = (f.blockTurns25 ?? 0) + 1; }
  // 区切りD: このカードで連携が起きた（コンビネーション・輪唱）
  if (ctx.comboLanded) {
    if (cardAbilities) abilityParts.push(...fireAbilities(state, rng, events, ally, 'combo', { ...fireOpts, list: cardAbilities }));
    abilityParts.push(...fireAbilities(state, rng, events, ally, 'combo', fireOpts));
    // 段階7a: 味方（自分も）の連携で動く能力（追撃の雷鳴刀）。狙うのは、連携が起きた敵（敵1体のカードなら、その敵）
    const comboFoe = (target && state.enemies.includes(target as EnemyState) ? target : undefined) ?? state.enemies.find((e) => !e.dead && ctx.hitIds.includes(e.uid));
    if (comboFoe && !comboFoe.dead) for (const a of state.allies) if (!a.dead) abilityParts.push(...fireAbilities(state, rng, events, a, 'allyCombo', { target: comboFoe, depth: 1 }));
  }
  // 段階7a: 共鳴する絆の指輪 — このカードで自分が得たブロックの一部を、HPの割合が一番低いほかの味方にも（分けたブロックは、もう一度は分けない）
  const share = shareBlockOf(ally);
  const gainedBlock = ally.block - selfBefore[0].block;
  if (share && gainedBlock > 0 && !ally.dead) {
    const mates = state.allies.filter((x) => x !== ally && !x.dead);
    const mate = mates.length ? mates.reduce((p, q) => (q.hp / q.maxHp < p.hp / p.maxHp ? q : p)) : undefined;
    const give = mate ? Math.floor((gainedBlock * share.effect.pct) / 100) : 0;
    if (mate && give > 0) {
      mate.block = Math.min(BALANCE.blockMax, mate.block + give);
      events.push({ type: 'block', unitId: mate.id, amount: give });
      abilityTriggered(state, ally.id, share.ability.name, events, share.ability.source);
      abilityParts.push(`${share.ability.name}（${mate.name}にブロック${give}）`);
    }
  }
  // 区切りD: 導きの光・アシスト・パスの印・血の代価は、攻撃カードを1枚使ったら消える（段階7a: 狂王の血鎧のためた分も）
  // （このカードを使っている間にためた分は、次の攻撃カードに残す）
  if (hasDamage) { delete ally.guided; delete ally.comboBoost; if (ally.counters?.bloodAdd) ally.counters.bloodAdd = 0; if (ally.counters?.nextAtkPct) ally.counters.nextAtkPct = 0; if (ally.counters?.rageAtkPct) ally.counters.rageAtkPct = Math.max(0, ally.counters.rageAtkPct - rageBefore); }
  // きっかけ: 自分が応援を付けた味方のカードが完全成功した（自分の応援は、1人パーティの時だけ数える）
  if (perfect && cheerer && !cheerer.dead && (cheerer !== ally || state.allies.length === 1)) fireAbilities(state, rng, events, cheerer, 'cheerPerfect', { allyTarget: ally, depth: 1 });
  // 分身は攻撃効果を半分の威力で繰り返す。追撃から再帰しない。
  for (const summon of ally.summons ?? []) {
    if (!summon.echoPct) continue;
    const echo = makeCtx(state, rng, events, ally, { card, target });
    // 分身の追撃は召喚の攻撃なので、かばう敵に逸らされない
    echo.echo = true;
    for (const eff of tier.effects) if (eff.kind === 'damage') applyEffect(echo, { ...eff, amount: Math.floor(eff.amount * summon.echoPct / 100) });
    if (echo.dealt > 0) abilityTriggered(state, ally.id, summon.name, events, { kind: 'summon', id: summon.id, label: summon.name });
  }

  state.stats.maxDamage = Math.max(state.stats.maxDamage, ctx.dealt);
  if (card.exhaust || card.trait?.effect && 'modifier' in card.trait.effect && card.trait.effect.modifier === 'exhaust') {
    (ally.exhaustedCards ??= []).push(card.id);
    ally.hand = ally.hand.filter(c => c.cardId !== card.id);
    ally.drawPile = ally.drawPile.filter(c => c.cardId !== card.id);
    ally.discard = ally.discard.filter(c => c.cardId !== card.id);
  } else ally.discard.push(inst);
  // このターンに使った枚数（連撃などの条件。カードの効果の後に数える）
  const uncounted = cardModifier(cardAbilities, 'noPlayCount').length > 0;
  if (!uncounted) ally.played = (ally.played ?? 0) + 1;
  if (perfect) { const cs = (ally.counters ??= {}); if (cs.perfectTurn !== state.turn) { cs.perfectTurn = state.turn; cs.perfectCount = 0; } cs.perfectCount = (cs.perfectCount ?? 0) + 1; }
  // 区切りD: コスト0のカードの枚数（流れる連撃）
  if (card.cost === 0) ally.playedZero = (ally.playedZero ?? 0) + 1;
  // 2026-11-14: 攻撃の札（敵を狙う札）の枚数（手数読みの「攻撃の札だけ数える」。数えない札は数えない）
  if (!uncounted && (card.target === 'enemy' || card.target === 'allEnemies')) ally.playedAttack = (ally.playedAttack ?? 0) + 1;
  // 区切りD: この戦闘で使った物理カードの枚数（無想阿修羅拳）
  if (card.category === 'physical') (ally.counters ??= {}).physBattle = (ally.counters.physBattle ?? 0) + 1;
  afterAttackCard(ally, card, tier);
  (ally.playedBy ??= {})[card.category] = (ally.playedBy[card.category] ?? 0) + 1;

  const resultLabel = perfect ? '完全成功' : `${successes}成功`;
  const summary = resultSummary(resultLabel, parts);
  const targetText = card.target === 'allEnemies' ? ' → 敵全体' : target ? ` → ${nameOf(target)}` : '';
  addLog(
    state,
    `${ally.name} ${card.name}${targetText} 成功率${chance}%${focusUsed ? `（🌟${focusUsed}）` : ''} → ${results
      .map((r) => SLOT_ICON[r])
      .join('')} = ${resultLabel}：${[...parts, ...abilityParts].join(' ')}`,
  );
  events.unshift({ type: 'roll', characterId: ally.id, cardId: card.id, targetId: target ? unitIdOf(target) : undefined, chance, results, successes, perfect, summary });
  checkEnd(state, events);
  return undefined;
}

/** 結果の帯の文: 「完全成功！ 9ダメージ・7ブロック」。何も起きなければ「1成功！」だけ */
export function resultSummary(resultLabel: string, parts: string[]): string {
  const list = parts.filter((x) => x && x.trim());
  return list.length ? `${resultLabel}！ ${list.join('・')}` : `${resultLabel}！`;
}

/** 予測の合計（1体ぶん）。値は [低い方, 高い方]（抽選のある攻撃は倍率の最小・最大） */
export interface PredictTotals { id: string; damage: [number, number]; hpLoss: [number, number]; heal: [number, number]; block: [number, number]; hits: [number, number]; /** この成功数なら、この敵の大技の予告を崩せる（BREAK。低い方の見込みでも崩せる時だけ） */ breaks?: boolean; /** 低い方・高い方のどちらの見込みでも付く状態異常（表示だけ。弱点の案内の「完全成功で〇〇確定」） */ statuses?: string[] }

/**
 * 実際のカード処理を複製上で試し、キャラごとの合計を返す。元の状態・乱数・予約は一切進めない。
 * hurtTargets = 回復の相手のHPを1にして試す（満タンの相手にも「回復の力」を見せるため。表示だけ）
 */
export function predictCardTotals(state: BattleState, characterId: string, cardInstanceId: string, targetId: string | undefined, focusUsed: number, tier: number, allyTargetId?: string, hurtTargets = false): PredictTotals[] {
  const original = findAlly(state, characterId), inst = original?.hand.find(c => c.uid === cardInstanceId);
  if (!original || !inst) return [];
  const card = cardOf(inst);
  const success = card.tiers[tier]?.minSuccesses;
  if (success === undefined) return [];
  const samples: BattleEvent[][] = [];
  for (const high of [false, true]) {
    const copy = structuredClone(state), a = findAlly(copy, characterId)!;
    delete copy.slotPreview;
    if (hurtTargets) for (const u of copy.allies) if (!u.dead && (u.id === targetId || u.id === allyTargetId || card.target === 'self')) u.hp = 1;
    const modified = structuredClone(card);
    for (const t of modified.tiers) for (const e of t.effects) if (e.kind === 'damage' && e.outcomes?.length) {
      e.outcomes = [{ weight: 1, multiplier: (high ? Math.max : Math.min)(...e.outcomes.map(o => o.multiplier)) }];
    }
    const rng = createRng(state.rngState);
    if (!state.slotPreview) rollSlots(card.slots, focusUsed, rollChanceFor(a, card, focusUsed, selectedCardTarget(copy, a, card, targetId), copy), rng);
    const results: SlotResult[] = Array.from({ length: card.slots }, (_, i) => i < success ? 'hit' : 'miss');
    const events: BattleEvent[] = [];
    const error = playCard(copy, { type: 'PLAY_CARD', playerId: a.playerId, characterId, cardInstanceId, targetId, allyTargetId, focusUsed }, rng, events, { chance: rollChanceFor(a, card, focusUsed, selectedCardTarget(copy, a, card, targetId), copy), results, card: modified });
    if (error) return [];
    samples.push(events);
  }
  const ids = [...new Set(samples.flat().flatMap(e => 'unitId' in e ? [e.unitId] : []))];
  return ids.map(id => {
    const totals = samples.map(events => {
      let damage = 0, hpLoss = 0, heal = 0, block = 0, hits = 0;
      for (const e of events) {
        if (!('unitId' in e) || e.unitId !== id) continue;
        if (e.type === 'damage') { damage += e.rawAmount ?? (e.amount + e.blocked); hpLoss += e.amount; hits++; }
        if (e.type === 'heal') heal += e.amount;
        if (e.type === 'block') block += e.amount;
      }
      return { damage, hpLoss, heal, block, hits };
    });
    const range = (k: keyof typeof totals[0]): [number, number] => [Math.min(...totals.map(t => t[k])), Math.max(...totals.map(t => t[k]))];
    const breaks = samples.every(events => events.some(e => e.type === 'break' && e.enemyUid === id));
    const given = samples.map(events => new Set(events.flatMap(e => (e.type === 'status' && e.unitId === id ? [e.status] : []))));
    const statuses = [...given[0]].filter(st => given.every(g => g.has(st)));
    return { id, damage: range('damage'), hpLoss: range('hpLoss'), heal: range('heal'), block: range('block'), hits: range('hits'), ...(breaks ? { breaks } : {}), ...(statuses.length ? { statuses } : {}) };
  });
}

/** 予測の値の書き方（同じなら1つ、違えば「7〜9」） */
export const rangeText = ([lo, hi]: [number, number]) => (lo === hi ? `${lo}` : `${lo}〜${hi}`);

/** 実際のカード処理を複製上で試す。元の状態・乱数・予約は一切進めない。抽選を伴う値は目安として示す。 */
export function predictCard(state: BattleState, characterId: string, cardInstanceId: string, targetId: string | undefined, focusUsed: number, tier: number, allyTargetId?: string) {
  return predictTexts(predictCardTotals(state, characterId, cardInstanceId, targetId, focusUsed, tier, allyTargetId));
}

/** 予測の合計を「ダメージ9（1回・HP減少9）・ブロック+7」の文にする */
export function predictTexts(list: PredictTotals[]): { id: string; text: string }[] {
  return list.flatMap(t => {
    const parts: string[] = [];
    if (t.damage[1] || t.hits[1]) parts.push(`ダメージ${rangeText(t.damage)}（${rangeText(t.hits)}回・HP減少${rangeText(t.hpLoss)}）`);
    if (t.heal[1]) parts.push(`HP回復${rangeText(t.heal)}`);
    if (t.block[1]) parts.push(`ブロック+${rangeText(t.block)}`);
    return parts.length ? [{ id: t.id, text: parts.join('・') }] : [];
  });
}

/** 呼び出したお供（幻獣・獣など）の攻撃。ターン終了時にランダムな敵へ。残りターンが0になったら帰る */
function summonsAttack(state: BattleState, ally: AllyState, rng: Rng, events: BattleEvent[]) {
  if (!ally.summons?.length) return;
  const twice = summonTwiceOf(ally);
  for (const s of [...ally.summons]) {
    if (!isStrikingSummon(s)) continue;
    const foes = state.enemies.filter((e) => !e.dead);
    if (!foes.length) break;
    // 狙いを合わせろ: このターンは、選んだ敵へ（倒れていたら、いつもどおり）
    const focus = ally.summonFocus?.turn === state.turn ? foes.find((e) => e.uid === ally.summonFocus!.uid) : undefined;
    const t = focus ?? (s.targetId ? foes.find(e => e.uid === s.targetId) ?? foes[0] : foes[rng.int(foes.length)]);
    summonStrikeOnce(state, ally, s, t, rng, events);
    // 永久機関: もう1回攻撃する（残りターンは1回分だけ減る）
    const again = twice ? state.enemies.filter((e) => !e.dead) : [];
    if (again.length) {
      const focus2 = ally.summonFocus?.turn === state.turn ? again.find((e) => e.uid === ally.summonFocus!.uid) : undefined;
      const t2 = focus2 ?? (s.targetId ? again.find(e => e.uid === s.targetId) ?? again[0] : again[rng.int(again.length)]);
      const loss2 = dealDamage(makeCtx(state, rng, events, ally, { target: t2, via: 'summon' }), t2, summonDamageOf(ally, s), s.element);
      if (loss2 > 0 && !ally.dead) fireAbilities(state, rng, events, ally, 'summonHit', { target: t2, depth: 1 });
      abilityTriggered(state, ally.id, twice!.name, events, twice!.source);
      addLog(state, `${ally.name}の${s.name}がもう1回攻撃！ ${enemyName(t2)}に${loss2}ダメージ`);
    }
    if (s.turns < 99) s.turns -= 1;
  }
  ally.summons = ally.summons.filter((s) => s.turns > 0);
}

/** 敵1体に使う道具か（狙う敵を選ぶ。閃光の破砕玉・氷結の魔石） */
export const itemTargetsEnemy = (effects: readonly { kind: string }[] | undefined) => !!effects?.some((e) => e.kind === 'flashBreak' || e.kind === 'iceGem');

/** 消費アイテム（効果の部品を使う。所持の管理は冒険側） */
function useItem(state: BattleState, cmd: Extract<Command, { type: 'USE_ITEM' }>, rng: Rng, events: BattleEvent[]): string | undefined {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  const user = findAlly(state, cmd.characterId);
  if (!user || user.dead) return '使うキャラが戦闘不能です';
  if (user.playerId !== cmd.playerId) return '担当していないキャラです';
  // 敵に使う道具（閃光の破砕玉・氷結の魔石）は、狙う敵を選ぶ
  const foeItem = itemTargetsEnemy(cmd.effects);
  const foe = foeItem ? state.enemies.find((e) => e.uid === cmd.targetId && !e.dead) : undefined;
  if (foeItem && !foe) return '狙う敵を選び直してください';
  const ally = foeItem ? undefined : findAlly(state, cmd.targetId);
  // 不死鳥の羽根は、倒れた味方にも生きている味方にも使える（区切りE）
  const anyState = cmd.effects.some(e => e.kind === 'phoenix');
  if (!foeItem && (!ally || (!anyState && (cmd.effects.some(e => e.kind === 'revive') ? !ally.dead : ally.dead)))) return '道具の対象を選び直してください';
  const target = foe ?? ally;
  const ctx = makeCtx(state, rng, events, user, { target });
  for (const e of cmd.effects) {
    const why = checkEffect(ctx, e);
    if (why) return why;
  }
  for (const e of cmd.effects) applyEffect(ctx, e);
  addLog(state, `${user.name}が${cmd.itemName}を使った${ctx.parts.length ? `（${ctx.parts.join(' ')}）` : ''}`);
  // 段階7a: 消耗品を使った時の能力（錬金術師のベルト）。道具を使うたびに1回（道具は袋の数しか無いので、回数は自然に限られる）
  if (!user.dead) fireAbilities(state, rng, events, user, 'itemUse', { depth: 1 });
  checkEnd(state, events);
  return undefined;
}

function endTurn(state: BattleState, playerId: string, rng: Rng, events: BattleEvent[]): string | undefined {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  if (!state.allies.some((a) => a.playerId === playerId)) return 'このパーティのプレイヤーではありません';
  // オンライン協力: 全員（生きているキャラの担当）が準備完了するまで待つ
  if (state.readyCheck) {
    const ready = state.ready ?? [];
    if (!ready.includes(playerId as PlayerId)) ready.push(playerId as PlayerId);
    state.ready = ready;
    events.push({ type: 'ready', playerId: playerId as PlayerId });
    if (waitingPlayers(state).length > 0) return undefined;
    state.ready = [];
  }
  // 装備の能力の数え: ここから次の自分の番までに、HPが減らなければ「無傷」
  for (const a of state.allies) if (!a.dead) (a.counters ??= {}).unhurt = 1;
  for (const a of state.allies) discardHand(a);
  // きっかけ: ターン終了時 → 継続ダメージ → 状態異常を1減らす
  for (const a of state.allies) if (!a.dead) fireAbilities(state, rng, events, a, 'turnEnd');
  for (const a of state.allies) if (!a.dead) summonsAttack(state, a, rng, events);
  tickDamageOverTime(state, 'ally', rng, events);
  for (const a of state.allies) decayStatuses(a.statuses);
  if (checkEnd(state, events)) return undefined;
  // 敵のブロックは敵フェーズ開始時に0へ。かばう（魔王軍の騎士）も、敵の番の始めに終わる
  for (const e of state.enemies) {
    e.block = 0;
    delete e.guarding;
    delete e.guardStyle;
  }
  state.phase = 'enemy';
  state.enemyCursor = 0;
  addLog(state, `--- 敵フェーズ ---`);
  events.push({ type: 'phase', phase: 'enemy' });
  for (const e of state.enemies) if (!e.dead) applyTickHeal(state, e, events);
  boonRegen(state, events);
  for (const e of state.enemies) if (!e.dead) fireAbilities(state, rng, events, e, 'turnStart');
  checkEnd(state, events);
  return undefined;
}

/** 敵フェーズを1ステップ進める。全員の行動後に呼ぶと敵フェーズ終了処理を行う */
function enemyStep(state: BattleState, rng: Rng, events: BattleEvent[]): string | undefined {
  if (state.phase !== 'enemy') return '敵フェーズではありません';
  while (state.enemyCursor < state.enemies.length && state.enemies[state.enemyCursor].dead) state.enemyCursor++;

  if (state.enemyCursor < state.enemies.length) {
    const enemy = state.enemies[state.enemyCursor];
    state.enemyCursor++;
    executeIntent(state, enemy, rng, events);
    checkEnd(state, events);
    return undefined;
  }

  // 敵フェーズ終了: ターン終了時の能力 → 継続ダメージ → 状態異常を1減らす → 挑発解除 → 次のインテント → 味方フェーズ
  for (const e of state.enemies) if (!e.dead) fireAbilities(state, rng, events, e, 'turnEnd');
  tickDamageOverTime(state, 'enemy', rng, events);
  if (checkEnd(state, events)) return undefined;
  for (const e of state.enemies) {
    decayStatuses(e.statuses);
    e.tauntedBy = undefined;
  }
  for (const a of state.allies) a.summons = a.summons?.filter(s => {
    if (!s.trigger) return true;
    s.turns -= 1;
    return !a.dead && s.turns > 0 && state.enemies.some(e => !e.dead && e.uid === s.targetId);
  });
  decideAllIntents(state, rng);
  addLog(state, `--- ターン${state.turn + 1} ---`);
  startAllyPhase(state, rng, events);
  checkEnd(state, events);
  return undefined;
}

/** 溜め（chargeTo）の行動が行われなかった時（BREAK・凍結・痺れ・時間停止・倒れた）: 溜めた次の行動も消す（次は元の順番から。2026-11-14） */
function dropCharge(enemy: EnemyState, action: EnemyActionDef) {
  if (action.chargeTo && enemy.queuedActionId === action.chargeTo) enemy.queuedActionId = undefined;
}

function executeIntent(state: BattleState, enemy: EnemyState, rng: Rng, events: BattleEvent[]) {
  // 空振りを無くす: 行動する時に、かばう相手がいない・仲間を呼べない（予告の後に満員・回数切れ）なら、代わりのふつうの攻撃にする
  // （かばうは、ふつうは敵が倒れた時点で変わっている。古い保存のためにも、ここで見る）
  fallbackUselessIntent(state, enemy, rng, events);
  const intent = enemy.intent;
  if (!intent) return;
  const action = getEnemyAction(enemy.defId, intent.actionId);
  const done = executeAction(state, enemy, action, rng, events);
  if (!done) dropCharge(enemy, action);
}

/** 予告の行動を行う。行えなかった（休んだ・失敗した・BREAK で止まった・行う前に倒れた）時は false */
function executeAction(state: BattleState, enemy: EnemyState, action: EnemyActionDef, rng: Rng, events: BattleEvent[]): boolean {
  if (enemy.skipNextAction) {
    delete enemy.skipNextAction;
    delete enemy.nextActionMultiplier;
    enemy.intent = undefined;
    events.push({ type: 'enemyAct', enemyUid: enemy.uid, actionName: '時間停止で休み', targetIds: [] });
    addLog(state, `${enemyName(enemy)}は時間停止で休んだ`);
    return false;
  }
  // 凍結: 次の行動を休む（効いたら1減る） / 痺れ: 確率で行動に失敗する
  const frozen = skipActionStatus(enemy.statuses);
  const fail = frozen ? 0 : actionFailChanceOf(enemy.statuses);
  if (frozen || (fail > 0 && rng.next() * 100 < fail)) {
    const why = frozen ? frozen.name : activeStatuses(enemy.statuses).find(({ def }) => def.actionFailChance)!.def.name;
    if (frozen) consumeStatus(enemy.statuses, frozen.id);
    events.push({ type: 'enemyAct', enemyUid: enemy.uid, actionName: `${why}で動けない`, targetIds: [] });
    addLog(state, `${enemyName(enemy)}は${why}で動けない！（「${action.name}」は失敗）`);
    enemy.intent = undefined;
    delete enemy.nextActionMultiplier;
    return false;
  }
  const ctx = makeCtx(state, rng, events, enemy);
  for (const owner of state.allies.filter(a => !a.dead)) {
    for (const token of [...(owner.summons ?? [])]) {
      if (token.trigger !== 'enemyBeforeAction' || token.targetId !== enemy.uid || enemy.dead) continue;
      owner.summons = owner.summons!.filter(s => s !== token);
      const trap = makeCtx(state, rng, events, owner, { target: enemy, via: 'summon' });
      for (const eff of token.effects ?? []) applyEffect(trap, eff);
      abilityTriggered(state, owner.id, token.name, events, { kind: 'summon', id: token.id, label: token.name });
      // 永久機関: 罠ももう1回発動する
      const twice = enemy.dead ? undefined : summonTwiceOf(owner);
      if (twice) {
        for (const eff of token.effects ?? []) applyEffect(trap, eff);
        abilityTriggered(state, owner.id, twice.name, events, twice.source);
      }
      addLog(state, `${owner.name}の${token.name}が発動した`);
      // きっかけ: 自分の罠が敵にダメージを与えた（観測射撃）
      if (trap.dealt > 0 && !owner.dead) fireAbilities(state, rng, events, owner, 'summonHit', { target: enemy, depth: 1 });
    }
  }
  if (enemy.dead) { enemy.intent = undefined; return false; }
  // 残り香（2026-11-14 開幕の一手）: BREAK された時は、元の効果の代わりに軽い効果だけを行う（倍率は掛けない）。溜めは消える
  if (enemy.broken && action.breakResidue?.length) {
    events.push({ type: 'enemyAct', enemyUid: enemy.uid, actionName: `「${action.name}」（BREAK で弱まった）`, targetIds: ctx.hitIds });
    delete enemy.nextActionMultiplier;
    for (const eff of action.breakResidue) applyEffect(ctx, eff);
    for (const n of ctx.fired) abilityTriggered(state, enemy.uid, n.name, events, n.source);
    addLog(state, `${enemyName(enemy)}は体勢が崩れて「${action.name}」が弱まった ${ctx.parts.join(' / ')}`);
    enemy.intent = undefined;
    return false;
  }
  // BREAK された大技のうち、ダメージの無い行動（浄化・仲間を呼ぶ・かばう・癒し封じなど）は起きない
  // （ダメージのある大技は、今までどおり威力が半分になる）
  if (enemy.broken && breakStopsAction(action)) {
    events.push({ type: 'enemyAct', enemyUid: enemy.uid, actionName: `BREAK で「${action.name}」が止まった`, targetIds: [] });
    addLog(state, `${enemyName(enemy)}は体勢が崩れて「${action.name}」ができなかった`);
    enemy.intent = undefined;
    delete enemy.nextActionMultiplier;
    return false;
  }
  // 演出用のイベントは先に積み、対象の一覧は効果を使った後に埋まる
  events.push({ type: 'enemyAct', enemyUid: enemy.uid, actionName: action.name, targetIds: ctx.hitIds });
  const actionMultiplier = enemy.nextActionMultiplier ?? 1;
  delete enemy.nextActionMultiplier;
  for (const eff of action.effects) {
    // 特殊な行動に足したブロックは、BREAK されていると付かない（崩れた体勢で守りは固められない。ブロックは BREAK で0のまま）
    if (enemy.broken && blockSkippedOnBreak(action, eff)) continue;
    applyEffect(ctx, 'amount' in eff && eff.amount !== undefined ? { ...eff, amount: Math.floor(eff.amount * actionMultiplier) } : eff);
  }
  for (const n of ctx.fired) abilityTriggered(state, enemy.uid, n.name, events, n.source);
  addLog(state, `${enemyName(enemy)}「${action.name}」${ctx.parts.join(' / ')}`);
  enemy.intent = undefined;
  return true;
}

/** ユニットのID（味方は id、敵は uid） */
export { unitIdOf };
