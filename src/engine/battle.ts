// ===== 戦闘エンジン（Reactに依存しない純粋関数） =====
// applyCommand(state, command) => { state, events }
// 入力の state は変更しない（内部で複製してから書き換える）。

import { BALANCE } from '../data/balance';
import { getCard } from '../data/cards';
import { getCharacter, partyFor } from '../data/characters';
import { ENCOUNTER, getEnemy, getEnemyAction } from '../data/enemies';
import type {
  AllyState,
  BattleEvent,
  BattleState,
  CardDef,
  CardEffect,
  Command,
  CommandResult,
  EnemyState,
  SlotResult,
  StatusId,
  Statuses,
} from '../types';
import { absorb, calcDamage } from './damage';
import { discardHand, drawCards } from './deck';
import {
  applyTaunt,
  decideAllIntents,

  livingAllies,
  livingEnemies,
  retargetAfterDeath,
} from './intents';
import { finalChance, selectTier } from './probability';
import { createRng, type Rng, shuffle } from './rng';

export const STATE_VERSION = 1;

const emptyStatuses = (): Statuses => ({ vulnerable: 0, weak: 0 });

export const STATUS_NAMES: Record<StatusId, string> = { vulnerable: '脆弱', weak: '弱体' };

// ---------- 生成 ----------

export function createBattle(seed: number, partySize: 2 | 4): BattleState {
  const rng = createRng(seed);
  let uid = 1;
  const allies: AllyState[] = partyFor(partySize).map((def) => {
    const cards = def.deck.flatMap((d) =>
      Array.from({ length: d.count }, () => ({ uid: `c${uid++}`, cardId: d.cardId })),
    );
    return {
      id: def.id,
      hp: def.maxHp,
      maxHp: def.maxHp,
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
  const hpMul = partySize === 4 ? BALANCE.fourPlayerEnemyHpMultiplier : 1;
  const enemies: EnemyState[] = ENCOUNTER.map((defId, i) => {
    const def = getEnemy(defId);
    const hp = Math.floor(def.maxHp * hpMul + 1e-9);
    return {
      uid: `e${i}`,
      defId,
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
    partySize,
    turn: 0,
    phase: 'ally',
    allies,
    enemies,
    enemyCursor: 0,
    stats: { totalDamage: 0, maxDamage: 0, perfects: 0, focusUsed: 0 },
    log: [],
    nextLogId: 1,
    nextUid: uid,
  };
  addLog(state, `戦闘開始（シード ${seed} / ${partySize}人）`);
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

export function unitName(state: BattleState, unitId: string): string {
  const ally = findAlly(state, unitId);
  if (ally) return getCharacter(ally.id).name;
  const enemy = findEnemy(state, unitId);
  if (enemy) return getEnemy(enemy.defId).name;
  return '?';
}

export function chanceFor(ally: AllyState, card: CardDef): number {
  return finalChance(card, getCharacter(ally.id).affinity);
}

/** カードが使えない理由（使えるなら null） */
export function unusableReason(state: BattleState, ally: AllyState, card: CardDef): string | null {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  if (ally.dead) return '戦闘不能です';
  if (ally.mana < card.cost) return 'マナが足りません';
  if (card.target === 'enemy' && livingEnemies(state).length === 0) return '対象がいません';
  return null;
}

export function usableCardCount(state: BattleState, ally: AllyState): number {
  return ally.hand.filter((c) => unusableReason(state, ally, getCard(c.cardId)) === null).length;
}

/** 行動完了（マナ切れ・使えるカードなし・戦闘不能） */
export function isDone(state: BattleState, ally: AllyState): boolean {
  return ally.dead || usableCardCount(state, ally) === 0;
}

/** カードのダメージ効果が対象に与える実際の値（Tierごと） */
export function tierDamageAgainst(ally: AllyState, card: CardDef, target: EnemyState): number[] {
  return card.tiers.map((t) =>
    t.effects
      .filter((e): e is Extract<CardEffect, { kind: 'damage' }> => e.kind === 'damage')
      .reduce((sum, e) => sum + calcDamage(e.amount, ally.statuses, target.statuses), 0),
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
  for (const a of livingAllies(state)) {
    a.block = 0;
    a.mana = BALANCE.manaPerTurn;
    const { reshuffled } = drawCards(a, BALANCE.drawPerTurn, rng);
    if (reshuffled) addLog(state, `${getCharacter(a.id).name}: 捨札をシャッフルして山札に戻した`);
  }
  events.push({ type: 'phase', phase: 'ally' });
}

function checkEnd(state: BattleState, events: BattleEvent[]): boolean {
  if (state.phase === 'victory' || state.phase === 'defeat') return true;
  if (livingEnemies(state).length === 0) {
    state.phase = 'victory';
    addLog(state, '勝利！');
    events.push({ type: 'phase', phase: 'victory' });
    return true;
  }
  if (livingAllies(state).length === 0) {
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

// ---------- ダメージ・死亡 ----------

function damageEnemy(state: BattleState, ally: AllyState, enemy: EnemyState, base: number, events: BattleEvent[]): number {
  if (enemy.dead) return 0;
  const dmg = calcDamage(base, ally.statuses, enemy.statuses);
  const r = absorb(dmg, enemy.block, enemy.hp);
  enemy.block = r.block;
  enemy.hp = r.hp;
  events.push({ type: 'damage', unitId: enemy.uid, amount: r.hpLoss, blocked: r.blocked });
  state.stats.totalDamage += r.hpLoss;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    enemy.intent = undefined;
    enemy.tauntedBy = undefined;
    enemy.block = 0;
    addLog(state, `${getEnemy(enemy.defId).name}を倒した`);
    events.push({ type: 'death', unitId: enemy.uid });
  }
  return r.hpLoss;
}

function damageAlly(
  state: BattleState,
  enemy: EnemyState,
  ally: AllyState,
  base: number,
  rng: Rng,
  events: BattleEvent[],
): void {
  if (ally.dead) return;
  const dmg = calcDamage(base, enemy.statuses, ally.statuses);
  const r = absorb(dmg, ally.block, ally.hp);
  ally.block = r.block;
  ally.hp = r.hp;
  events.push({ type: 'damage', unitId: ally.id, amount: r.hpLoss, blocked: r.blocked });
  if (ally.hp <= 0) {
    ally.dead = true;
    ally.block = 0;
    ally.statuses = emptyStatuses();
    addLog(state, `${getCharacter(ally.id).name}が戦闘不能になった`);
    events.push({ type: 'death', unitId: ally.id });
    retargetAfterDeath(state, ally.id, rng, events);
  }
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
      error = endTurn(state, events);
      break;
    case 'ENEMY_STEP':
      error = enemyStep(state, rng, events);
      break;
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
  const idx = ally.hand.findIndex((c) => c.uid === cmd.cardInstanceId);
  if (idx < 0) return '手札にありません';
  const inst = ally.hand[idx];
  const card = getCard(inst.cardId);
  const reason = unusableReason(state, ally, card);
  if (reason) return reason;
  const focusUsed = Math.floor(cmd.focusUsed);
  if (focusUsed < 0 || focusUsed > Math.min(card.slots, ally.focus)) return 'フォーカスの数が不正です';

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

  // 効果
  let dealt = 0;
  const parts: string[] = [];
  for (const eff of tier.effects) {
    switch (eff.kind) {
      case 'damage':
        if (target) {
          const d = damageEnemy(state, ally, target, eff.amount, events);
          dealt += d;
        }
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
        if (reshuffled) addLog(state, `${getCharacter(ally.id).name}: 捨札をシャッフルして山札に戻した`);
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
  if (tier.effects.some((e) => e.kind === 'damage')) parts.unshift(`${dealt} DMG`);
  state.stats.maxDamage = Math.max(state.stats.maxDamage, dealt);
  ally.discard.push(inst);

  const resultLabel = perfect ? '完全成功' : `${successes}成功`;
  const summary = `${resultLabel}！ ${parts.join(' ')}`;
  const targetText = target ? ` → ${getEnemy(target.defId).name}` : '';
  addLog(
    state,
    `${getCharacter(ally.id).name} ${card.name}${targetText} 成功率${chance}%${focusUsed ? `（🌟${focusUsed}）` : ''} → ${results
      .map((r) => SLOT_ICON[r])
      .join('')} = ${resultLabel}：${parts.join(' ')}`,
  );
  events.unshift({
    type: 'roll',
    characterId: ally.id,
    cardId: card.id,
    chance,
    results,
    successes,
    perfect,
    summary,
  });
  checkEnd(state, events);
  return undefined;
}

function endTurn(state: BattleState, events: BattleEvent[]): string | undefined {
  if (state.phase !== 'ally') return '味方フェーズではありません';
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
  // 次に行動する生存敵を探す
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
  const name = getEnemy(enemy.defId).name;
  events.push({ type: 'enemyAct', enemyUid: enemy.uid, actionName: action.name });
  const logParts: string[] = [];
  for (const eff of action.effects) {
    switch (eff.kind) {
      case 'attack': {
        for (let h = 0; h < eff.hits; h++) {
          const targets =
            eff.target === 'all'
              ? livingAllies(state)
              : ([findAlly(state, enemy.intent?.targetId ?? '')].filter((a) => a && !a.dead) as AllyState[]);
          for (const t of targets) {
            const before = t.hp;
            damageAlly(state, enemy, t, eff.amount, rng, events);
            logParts.push(`${getCharacter(t.id).name}に${before - t.hp}`);
          }
        }
        break;
      }
      case 'block': {
        const targets =
          eff.target === 'self' ? [enemy] : livingEnemies(state).filter((e) => e.uid !== enemy.uid);
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
          events.push({ type: 'status', unitId: t.id, status: eff.status, amount: eff.amount });
          logParts.push(`${getCharacter(t.id).name}に${STATUS_NAMES[eff.status]}${eff.amount}`);
        }
        break;
      }
    }
  }
  addLog(state, `${name}「${action.name}」${logParts.join(' / ')}`);
  enemy.intent = undefined;
}


