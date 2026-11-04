// ===== 戦闘エンジン（Reactに依存しない純粋関数） =====
// applyCommand(state, command) => { state, events }
// 入力の state は変更しない（内部で複製してから書き換える）。

import { BALANCE } from '../../data/balance';
import { getCard } from '../../data/cards';
import { getClass } from '../../data/classes';
import { getEnemy, getEnemyAction } from '../../data/enemies';
import type {
  AllyState,
  BattleEvent,
  BattleSetup,
  BattleState,
  CardDef,
  CardEffect,
  Command,
  CommandResult,
  EnemyState,
  SlotResult,
  StatusId,
  Statuses,
} from '../../types';
import { coverChance, damageMultiplierFor, perfectAbilities } from '../abilities';
import { createRng, type Rng, shuffle } from '../rng';
import { affinityOf } from '../stats';
import { absorb, calcDamage } from './damage';
import { discardHand, drawCards } from './deck';
import {
  applyTaunt,
  decideAllIntents,
  enemyHitDamage,
  livingAllies,
  livingEnemies,
  retargetAfterDeath,
} from './intents';
import { finalChance, selectTier } from './probability';

export const STATE_VERSION = 2;

const emptyStatuses = (): Statuses => ({ vulnerable: 0, weak: 0 });

export const STATUS_NAMES: Record<StatusId, string> = { vulnerable: '脆弱', weak: '弱体' };

// ---------- 生成 ----------

/** 敵のレベル補正（HP・攻撃の倍率）。baseLevel で 1.0 */
export function enemyLevelFactors(baseLevel: number, level: number) {
  const d = level - baseLevel;
  return {
    hp: Math.max(0.3, 1 + BALANCE.enemyHpPerLevel * d),
    attack: Math.max(0.3, 1 + BALANCE.enemyAttackPerLevel * d),
  };
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
    const cards = def.deck.flatMap((d) => {
      getCard(d.cardId); // 存在チェック
      return Array.from({ length: d.count }, () => ({ uid: `c${uid++}`, cardId: d.cardId }));
    });
    return {
      id: `a${i}`,
      classId: def.id,
      gender: m.gender,
      name: m.name,
      playerId: m.playerId,
      level: m.level ?? 1,
      hp: def.baseMaxHp,
      maxHp: def.baseMaxHp,
      block: 0,
      mana: 0,
      focus: BALANCE.focusStart,
      statuses: emptyStatuses(),
      drawPile: shuffle(cards, rng),
      hand: [],
      discard: [],
      dead: false,
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
    const f = enemyLevelFactors(def.baseLevel, level);
    const hp = Math.max(1, Math.floor(def.maxHp * f.hp * partyMul + 1e-9));
    const n = seen.get(spec.defId) ?? 0;
    seen.set(spec.defId, n + 1);
    return {
      uid: `e${i}`,
      defId: spec.defId,
      nameSuffix: (counts.get(spec.defId) ?? 0) > 1 ? String.fromCharCode(65 + n) : undefined,
      level,
      attackMul: f.attack,
      hp,
      maxHp: hp,
      block: 0,
      statuses: emptyStatuses(),
      seqIndex: 0,
      history: [],
      dead: false,
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
  };
  addLog(state, `戦闘開始（シード ${seed} / ${party.length}人 / ${encounter.name}）`);
  decideAllIntents(state, rng);
  startAllyPhase(state, rng, []);
  state.rngState = rng.state;
  return state;
}

// ---------- 参照用ヘルパー ----------

export function findAlly(state: BattleState, id: string): AllyState | undefined {
  return state.allies.find((a) => a.id === id);
}

export function findEnemy(state: BattleState, uid: string): EnemyState | undefined {
  return state.enemies.find((e) => e.uid === uid);
}

export function enemyName(enemy: EnemyState): string {
  return getEnemy(enemy.defId).name + (enemy.nameSuffix ? ` ${enemy.nameSuffix}` : '');
}

export function unitName(state: BattleState, unitId: string): string {
  const ally = findAlly(state, unitId);
  if (ally) return ally.name;
  const enemy = findEnemy(state, unitId);
  if (enemy) return enemyName(enemy);
  return '?';
}

export function chanceFor(ally: AllyState, card: CardDef): number {
  return finalChance(card, affinityOf(ally));
}

/** カードが使えない理由（使えるなら null） */
export function unusableReason(state: BattleState, ally: AllyState, card: CardDef): string | null {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  if (ally.dead) return '戦闘不能です';
  if (ally.mana < card.cost) return 'マナが足りません';
  if (card.target === 'enemy' && !state.enemies.some((e) => !e.dead)) return '対象がいません';
  return null;
}

export function usableCardCount(state: BattleState, ally: AllyState): number {
  let n = 0;
  for (const c of ally.hand) if (unusableReason(state, ally, getCard(c.cardId)) === null) n++;
  return n;
}

/** 行動完了（マナ切れ・使えるカードなし・戦闘不能） */
export function isDone(state: BattleState, ally: AllyState): boolean {
  return ally.dead || usableCardCount(state, ally) === 0;
}

/** カードのダメージ効果が対象に与える実際の値（Tierごと。特殊能力の倍率も反映） */
export function tierDamageAgainst(ally: AllyState, card: CardDef, target: EnemyState): number[] {
  const { multiplier } = damageMultiplierFor(ally, card);
  return card.tiers.map((t) =>
    t.effects
      .filter((e): e is Extract<CardEffect, { kind: 'damage' }> => e.kind === 'damage')
      .reduce((sum, e) => sum + calcDamage(e.amount, ally.statuses, target.statuses, multiplier), 0),
  );
}

// ---------- ログ ----------

function addLog(state: BattleState, text: string) {
  state.log.push({ id: state.nextLogId++, turn: state.turn, text });
  if (state.log.length > BALANCE.logLimit) state.log.splice(0, state.log.length - BALANCE.logLimit);
}

const SLOT_ICON: Record<SlotResult, string> = { focus: '🌟', hit: '⭕', miss: '❌' };

// ---------- フェーズ ----------

function startAllyPhase(state: BattleState, rng: Rng, events: BattleEvent[]) {
  state.turn += 1;
  state.phase = 'ally';
  for (const a of state.allies) {
    if (a.dead) continue;
    a.block = 0;
    a.mana = BALANCE.manaPerTurn;
    const { reshuffled } = drawCards(a, BALANCE.drawPerTurn, rng);
    if (reshuffled) addLog(state, `${a.name}: 捨札をシャッフルして山札に戻した`);
  }
  events.push({ type: 'phase', phase: 'ally' });
}

function checkEnd(state: BattleState, events: BattleEvent[]): boolean {
  if (state.phase === 'victory' || state.phase === 'defeat') return true;
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

function decrementStatuses(s: Statuses) {
  s.vulnerable = Math.max(0, s.vulnerable - 1);
  s.weak = Math.max(0, s.weak - 1);
}

function abilityTriggered(state: BattleState, unitId: string, name: string, events: BattleEvent[]) {
  state.stats.abilityTriggers += 1;
  events.push({ type: 'ability', unitId, name });
}

// ---------- ダメージ・死亡 ----------

/** 敵にダメージ（計算済みの値）を与える。HPに入った量を返す */
function hitEnemy(state: BattleState, enemy: EnemyState, dmg: number, sourceId: string, events: BattleEvent[]): number {
  if (enemy.dead) return 0;
  const r = absorb(dmg, enemy.block, enemy.hp);
  enemy.block = r.block;
  enemy.hp = r.hp;
  events.push({ type: 'damage', unitId: enemy.uid, amount: r.hpLoss, blocked: r.blocked, sourceId });
  state.stats.totalDamage += r.hpLoss;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    enemy.intent = undefined;
    enemy.tauntedBy = undefined;
    enemy.block = 0;
    addLog(state, `${enemyName(enemy)}を倒した`);
    events.push({ type: 'death', unitId: enemy.uid });
  }
  return r.hpLoss;
}

/** 敵の攻撃1回を味方に当てる（かばうの判定を含む） */
function hitAlly(
  state: BattleState,
  enemy: EnemyState,
  target: AllyState,
  base: number,
  rng: Rng,
  events: BattleEvent[],
): { victim: AllyState; hpLoss: number } {
  let victim = target;
  let dmg = enemyHitDamage(enemy, base, victim);
  // かばう: このままだとHP0になる場合、他の味方が確率で代わりに受ける
  if (dmg - victim.block >= victim.hp) {
    for (const other of state.allies) {
      if (other.dead || other.id === victim.id) continue;
      const cov = coverChance(other);
      if (!cov) continue;
      if (rng.next() * 100 < cov.chance) {
        abilityTriggered(state, other.id, cov.name, events);
        addLog(state, `${other.name}の「${cov.name}」！ ${victim.name}をかばった`);
        victim = other;
        dmg = enemyHitDamage(enemy, base, victim);
        break;
      }
    }
  }
  const r = absorb(dmg, victim.block, victim.hp);
  victim.block = r.block;
  victim.hp = r.hp;
  events.push({ type: 'damage', unitId: victim.id, amount: r.hpLoss, blocked: r.blocked, sourceId: enemy.uid });
  if (victim.hp <= 0) {
    victim.dead = true;
    victim.block = 0;
    victim.statuses = emptyStatuses();
    addLog(state, `${victim.name}が戦闘不能になった`);
    events.push({ type: 'death', unitId: victim.id });
    retargetAfterDeath(state, victim.id, rng, events);
  }
  return { victim, hpLoss: r.hpLoss };
}

// ---------- コマンド処理 ----------

export function applyCommand(input: BattleState, cmd: Command): CommandResult {
  const state: BattleState = structuredClone(input);
  const rng = createRng(input.rngState);
  const events: BattleEvent[] = [];
  let error: string | undefined;
  switch (cmd.type) {
    case 'PLAY_CARD':
      error = playCard(state, cmd, rng, events);
      break;
    case 'END_TURN':
      error = endTurn(state, cmd.playerId, events);
      break;
    case 'ENEMY_STEP':
      error = enemyStep(state, rng, events);
      break;
    default:
      error = '不明なコマンドです';
  }
  if (error) return { state: input, events: [], error };
  state.rngState = rng.state;
  return { state, events };
}

/** スロットを振る（フォーカス枠は左に並べて確定成功） */
export function rollSlots(slots: number, focusUsed: number, chance: number, rng: Rng): SlotResult[] {
  const out: SlotResult[] = [];
  for (let i = 0; i < slots; i++) {
    if (i < focusUsed) out.push('focus');
    else out.push(rng.next() < chance / 100 ? 'hit' : 'miss');
  }
  return out;
}

function playCard(
  state: BattleState,
  cmd: Extract<Command, { type: 'PLAY_CARD' }>,
  rng: Rng,
  events: BattleEvent[],
): string | undefined {
  const ally = findAlly(state, cmd.characterId);
  if (!ally) return 'キャラクターが見つかりません';
  if (ally.playerId !== cmd.playerId) return '担当していないキャラです';
  const idx = ally.hand.findIndex((c) => c.uid === cmd.cardInstanceId);
  if (idx < 0) return '手札にありません';
  const inst = ally.hand[idx];
  const card = getCard(inst.cardId);
  const reason = unusableReason(state, ally, card);
  if (reason) return reason;
  const focusUsed = cmd.focusUsed;
  if (!Number.isInteger(focusUsed) || focusUsed < 0 || focusUsed > Math.min(card.slots, ally.focus))
    return 'フォーカスの数が不正です';

  let target: EnemyState | undefined;
  if (card.target === 'enemy') {
    target = cmd.targetId ? findEnemy(state, cmd.targetId) : undefined;
    if (!target || target.dead) return '対象を選んでください';
  }

  // 支払い
  ally.mana -= card.cost;
  ally.focus -= focusUsed;
  ally.hand.splice(idx, 1);
  state.stats.focusUsed += focusUsed;

  // 判定
  const chance = chanceFor(ally, card);
  const results = rollSlots(card.slots, focusUsed, chance, rng);
  const successes = results.filter((r) => r !== 'miss').length;
  const perfect = successes === card.slots;
  if (perfect) state.stats.perfects += 1;
  const tier = selectTier(card, successes);
  const dmgMul = damageMultiplierFor(ally, card);

  // 効果
  let dealt = 0;
  const parts: string[] = [];
  for (const eff of tier.effects) {
    switch (eff.kind) {
      case 'damage':
        if (target) dealt += hitEnemy(state, target, calcDamage(eff.amount, ally.statuses, target.statuses, dmgMul.multiplier), ally.id, events);
        break;
      case 'block':
        ally.block += eff.amount;
        events.push({ type: 'block', unitId: ally.id, amount: eff.amount });
        parts.push(`${eff.amount} BLOCK`);
        break;
      case 'applyStatus':
        if (target && !target.dead) {
          target.statuses[eff.status] += eff.amount;
          events.push({ type: 'status', unitId: target.uid, status: eff.status, amount: eff.amount });
          parts.push(`${STATUS_NAMES[eff.status]}${eff.amount}`);
        }
        break;
      case 'gainMana':
        ally.mana += eff.amount;
        parts.push(`マナ+${eff.amount}`);
        break;
      case 'gainFocus': {
        const before = ally.focus;
        ally.focus = Math.min(BALANCE.focusMax, ally.focus + eff.amount);
        parts.push(`フォーカス+${ally.focus - before}`);
        break;
      }
      case 'draw': {
        const { drawn, reshuffled } = drawCards(ally, eff.amount, rng);
        if (reshuffled) addLog(state, `${ally.name}: 捨札をシャッフルして山札に戻した`);
        parts.push(`${drawn}枚ドロー`);
        break;
      }
      case 'tauntTarget':
        if (target) {
          applyTaunt(target, ally.id, events);
          parts.push('挑発');
        }
        break;
      case 'tauntAll':
        for (const e of livingEnemies(state)) applyTaunt(e, ally.id, events);
        parts.push('全体挑発');
        break;
    }
  }
  const hasDamage = tier.effects.some((e) => e.kind === 'damage');
  if (hasDamage) parts.unshift(`${dealt} DMG`);
  if (hasDamage && dmgMul.active.length) {
    for (const n of dmgMul.active) abilityTriggered(state, ally.id, n, events);
  }

  // 完全成功時の特殊能力
  if (perfect) {
    for (const ab of perfectAbilities(ally, card)) {
      const e = ab.effect;
      if ((e.kind === 'onPerfectBonusDamage' || e.kind === 'onPerfectApplyStatus') && e.chance !== undefined && rng.next() * 100 >= e.chance)
        continue;
      if (e.kind === 'onPerfectBonusDamage') {
        const alive = livingEnemies(state);
        if (!alive.length) continue;
        const t = alive[rng.int(alive.length)];
        abilityTriggered(state, ally.id, ab.name, events);
        const d = hitEnemy(state, t, calcDamage(e.amount, ally.statuses, t.statuses), ally.id, events);
        dealt += d;
        parts.push(`${ab.name}+${d}`);
        addLog(state, `${ally.name}の「${ab.name}」！ ${enemyName(t)}に${d}ダメージ`);
      } else if (e.kind === 'onPerfectApplyStatus' && hasDamage && target && !target.dead) {
        abilityTriggered(state, ally.id, ab.name, events);
        target.statuses[e.status] += e.amount;
        events.push({ type: 'status', unitId: target.uid, status: e.status, amount: e.amount });
        parts.push(`${ab.name}`);
        addLog(state, `${ally.name}の「${ab.name}」！ ${enemyName(target)}に${STATUS_NAMES[e.status]}${e.amount}`);
      }
    }
  }

  state.stats.maxDamage = Math.max(state.stats.maxDamage, dealt);
  ally.discard.push(inst);

  const resultLabel = perfect ? '完全成功' : `${successes}成功`;
  const summary = `${resultLabel}！ ${parts.join(' ')}`;
  const targetText = target ? ` → ${enemyName(target)}` : '';
  addLog(
    state,
    `${ally.name} ${card.name}${targetText} 成功率${chance}%${focusUsed ? `（🌟${focusUsed}）` : ''} → ${results
      .map((r) => SLOT_ICON[r])
      .join('')} = ${resultLabel}：${parts.join(' ')}`,
  );
  events.unshift({
    type: 'roll',
    characterId: ally.id,
    cardId: card.id,
    targetId: target?.uid,
    chance,
    results,
    successes,
    perfect,
    summary,
  });
  checkEnd(state, events);
  return undefined;
}

function endTurn(state: BattleState, playerId: string, events: BattleEvent[]): string | undefined {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  if (!state.allies.some((a) => a.playerId === playerId)) return 'このパーティのプレイヤーではありません';
  for (const a of state.allies) {
    discardHand(a);
    decrementStatuses(a.statuses);
  }
  // 敵のブロックは敵フェーズ開始時に0へ
  for (const e of state.enemies) e.block = 0;
  state.phase = 'enemy';
  state.enemyCursor = 0;
  addLog(state, `--- 敵フェーズ ---`);
  events.push({ type: 'phase', phase: 'enemy' });
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

  // 敵フェーズ終了: 状態異常を1減らす → 挑発解除 → 次のインテント → 味方フェーズ
  for (const e of state.enemies) {
    decrementStatuses(e.statuses);
    e.tauntedBy = undefined;
  }
  decideAllIntents(state, rng);
  addLog(state, `--- ターン${state.turn + 1} ---`);
  startAllyPhase(state, rng, events);
  return undefined;
}

function executeIntent(state: BattleState, enemy: EnemyState, rng: Rng, events: BattleEvent[]) {
  const intent = enemy.intent;
  if (!intent) return;
  const action = getEnemyAction(enemy.defId, intent.actionId);
  const targetIds: string[] = [];
  events.push({ type: 'enemyAct', enemyUid: enemy.uid, actionName: action.name, targetIds });
  const logParts: string[] = [];
  for (const eff of action.effects) {
    switch (eff.kind) {
      case 'attack': {
        for (let h = 0; h < eff.hits; h++) {
          const targets =
            eff.target === 'all'
              ? livingAllies(state)
              : [findAlly(state, enemy.intent?.targetId ?? '')].filter((a): a is AllyState => !!a && !a.dead);
          for (const t of targets) {
            const { victim, hpLoss } = hitAlly(state, enemy, t, eff.amount, rng, events);
            if (!targetIds.includes(victim.id)) targetIds.push(victim.id);
            logParts.push(`${victim.name}に${hpLoss}`);
          }
        }
        break;
      }
      case 'block': {
        const targets = eff.target === 'self' ? [enemy] : livingEnemies(state).filter((e) => e.uid !== enemy.uid);
        for (const t of targets) {
          t.block += eff.amount;
          events.push({ type: 'block', unitId: t.uid, amount: eff.amount });
        }
        logParts.push(targets.length ? `ブロック${eff.amount}` : '（効果なし）');
        break;
      }
      case 'debuff': {
        const t = findAlly(state, enemy.intent?.targetId ?? '');
        if (t && !t.dead) {
          t.statuses[eff.status] += eff.amount;
          if (!targetIds.includes(t.id)) targetIds.push(t.id);
          events.push({ type: 'status', unitId: t.id, status: eff.status, amount: eff.amount });
          logParts.push(`${t.name}に${STATUS_NAMES[eff.status]}${eff.amount}`);
        }
        break;
      }
    }
  }
  addLog(state, `${enemyName(enemy)}「${action.name}」${logParts.join(' / ')}`);
  enemy.intent = undefined;
}
