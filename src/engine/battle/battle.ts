// ===== 戦闘エンジン（Reactに依存しない純粋関数） =====
// applyCommand(state, command) => { state, events }
// 入力の state は変更しない（内部で複製してから書き換える）。
// 効果の中身は effects/、特殊能力は ../abilities、状態異常は statuses.ts。ここは戦闘の流れだけを書く。

import { BALANCE } from '../../data/balance';
import { cardOf } from '../../data/cards';
import { getClass } from '../../data/classes';
import { getEnemy, getEnemyAction } from '../../data/enemies';
import type {
  AllyState,
  BattleEvent,
  BattleSetup,
  BattleState,
  CardDef,
  CardInstance,
  Command,
  CommandResult,
  EnemyDef,
  EnemyState,
  SlotResult,
  Statuses,
} from '../../types';
import { damageModifiers, fireAbilities } from '../abilities';
import { createRng, type Rng, shuffle } from '../rng';
import { affinityOf } from '../stats';
import { calcDamage } from './damage';
import { discardHand, drawCards } from './deck';
import { applyEffect, checkEffect, makeCtx, targetOf } from './effects';
import { decideAllIntents } from './intents';
import { finalChance, selectTier } from './probability';
import { applyTick, decayStatuses, emptyStatuses } from './statuses';
import { abilityTriggered, addLog, enemyName, findAlly, findEnemy, loseHp, nameOf, unitIdOf } from './units';

export { enemyName, findAlly, findEnemy, unitName } from './units';

export const STATE_VERSION = 4;

// ---------- 生成 ----------

/** 敵のレベル補正（HP・攻撃の倍率）。baseLevel で 1.0。伸び方は敵ごとに変えられる（省略は共通値） */
export function enemyLevelFactors(def: Pick<EnemyDef, 'baseLevel' | 'hpPerLevel' | 'attackPerLevel'>, level: number) {
  const d = level - def.baseLevel;
  return {
    hp: Math.max(0.3, 1 + (def.hpPerLevel ?? BALANCE.enemyHpPerLevel) * d),
    attack: Math.max(0.3, 1 + (def.attackPerLevel ?? BALANCE.enemyAttackPerLevel) * d),
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
      mana: 0,
      focus: m.focus ?? BALANCE.focusStart,
      focusMax: m.focusMax ?? BALANCE.focusMax,
      stats: m.stats ?? def.stats,
      extraDraw: m.extraDraw ?? 0,
      ...(m.abilities?.length ? { abilities: structuredClone(m.abilities) } : {}),
      statuses: { ...emptyStatuses(), ...(m.statuses as Statuses) },
      drawPile: shuffle(cards, rng),
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
    const hp = Math.max(1, Math.floor(def.maxHp * f.hp * partyMul * (setup.enemyHpMul ?? 1) + 1e-9));
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
  addLog(state, `戦闘開始（${party.length}人 / ${encounter.name}）`);
  decideAllIntents(state, rng);
  startAllyPhase(state, rng, []);
  // 装備による戦闘開始時のブロック（味方フェーズ開始のリセットの後に入れる）
  party.forEach((m, i) => {
    if (m.startBlock && !allies[i].dead) allies[i].block += m.startBlock;
  });
  // きっかけ: 戦闘開始時
  for (const u of [...state.allies, ...state.enemies]) if (!u.dead) fireAbilities(state, rng, [], u, 'battleStart');
  state.rngState = rng.state;
  return state;
}

// ---------- 参照用ヘルパー ----------

export function chanceFor(ally: AllyState, card: CardDef): number {
  return finalChance(card, affinityOf(ally));
}

/** 対象として敵を選ぶ必要があるカードか */
export const needsEnemyTarget = (card: CardDef) => card.target === 'enemy';

/** カードが使えない理由（使えるなら null） */
export function unusableReason(state: BattleState, ally: AllyState, card: CardDef): string | null {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  if (ally.dead) return '戦闘不能です';
  if (ally.mana < card.cost) return 'マナが足りません';
  if ((card.target === 'enemy' || card.target === 'allEnemies') && !state.enemies.some((e) => !e.dead)) return '対象がいません';
  return null;
}

export function usableCardCount(state: BattleState, ally: AllyState): number {
  let n = 0;
  for (const c of ally.hand) if (unusableReason(state, ally, cardOf(c)) === null) n++;
  return n;
}

/** 行動完了（マナ切れ・使えるカードなし・戦闘不能） */
export function isDone(state: BattleState, ally: AllyState): boolean {
  return ally.dead || usableCardCount(state, ally) === 0;
}

/** カードのダメージ効果が対象に与える実際の値（Tierごとの合計。特殊能力の倍率・状態異常も反映） */
export function tierDamageAgainst(ally: AllyState, card: CardDef, target: EnemyState): number[] {
  const { multiplier } = damageModifiers(undefined, ally, card, target, card.trait ? [card.trait] : undefined);
  return card.tiers.map((t) =>
    t.effects.reduce((sum, e) => {
      if (e.kind !== 'damage' || (targetOf(e) !== 'target' && targetOf(e) !== 'foes')) return sum;
      return sum + calcDamage(e.amount, ally.statuses, target.statuses, multiplier) * (e.hits ?? 1);
    }, 0),
  );
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
    const { reshuffled } = drawCards(a, BALANCE.drawPerTurn + a.extraDraw, rng);
    if (reshuffled) addLog(state, `${a.name}: 捨札をシャッフルして山札に戻した`);
  }
  // きっかけ: ターン開始時（ブロックのリセットの後）
  for (const a of state.allies) if (!a.dead) fireAbilities(state, rng, events, a, 'turnStart');
  events.push({ type: 'phase', phase: 'ally' });
}

function checkEnd(state: BattleState, events: BattleEvent[]): boolean {
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

/** 継続ダメージの状態異常（毒・火傷など。ブロックを無視）→ その状態異常は減る */
function tickDamageOverTime(state: BattleState, side: 'ally' | 'enemy', rng: Rng, events: BattleEvent[]) {
  const units = side === 'ally' ? state.allies : state.enemies;
  for (const u of units) {
    if (u.dead) continue;
    const { damage, names } = applyTick(u.statuses);
    if (damage <= 0) continue;
    addLog(state, `${nameOf(u)}は${names.join('・')}で${Math.min(u.hp, damage)}ダメージ`);
    loseHp(state, u, damage, rng, events);
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
      error = endTurn(state, cmd.playerId, rng, events);
      break;
    case 'ENEMY_STEP':
      error = enemyStep(state, rng, events);
      break;
    case 'USE_ITEM':
      error = useItem(state, cmd, rng, events);
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

function playCard(state: BattleState, cmd: Extract<Command, { type: 'PLAY_CARD' }>, rng: Rng, events: BattleEvent[]): string | undefined {
  const ally = findAlly(state, cmd.characterId);
  if (!ally) return 'キャラが見つかりません';
  if (ally.playerId !== cmd.playerId) return '担当していないキャラです';
  const idx = ally.hand.findIndex((c) => c.uid === cmd.cardInstanceId);
  if (idx < 0) return '手札にありません';
  const inst = ally.hand[idx];
  const card = cardOf(inst);
  const reason = unusableReason(state, ally, card);
  if (reason) return reason;
  const focusUsed = cmd.focusUsed;
  if (!Number.isInteger(focusUsed) || focusUsed < 0 || focusUsed > Math.min(card.slots, ally.focus)) return 'フォーカスの数が不正です';

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

  // 効果（効果の部品を順に使う）
  const cardAbilities = card.trait ? [card.trait] : undefined;
  const ctx = makeCtx(state, rng, events, ally, { target, card, cardAbilities });
  for (const eff of tier.effects) applyEffect(ctx, eff);
  const parts = ctx.parts;
  const hasDamage = tier.effects.some((e) => e.kind === 'damage');
  if (hasDamage) parts.unshift(`${ctx.dealt} DMG`);
  // 働いた常時型の能力（闘志・貫通・止めなど）
  for (const n of ctx.fired) abilityTriggered(state, ally.id, n, events);

  // きっかけ: カードの特殊能力 → 自分の能力（カードを使った後 → 完全成功時）
  const fireOpts = { card, target, dealt: ctx.dealt };
  if (cardAbilities) {
    parts.push(...fireAbilities(state, rng, events, ally, 'afterCard', { ...fireOpts, list: cardAbilities }));
    if (perfect) parts.push(...fireAbilities(state, rng, events, ally, 'perfect', { ...fireOpts, list: cardAbilities }));
  }
  parts.push(...fireAbilities(state, rng, events, ally, 'afterCard', fireOpts));
  if (perfect) parts.push(...fireAbilities(state, rng, events, ally, 'perfect', fireOpts));

  state.stats.maxDamage = Math.max(state.stats.maxDamage, ctx.dealt);
  ally.discard.push(inst);

  const resultLabel = perfect ? '完全成功' : `${successes}成功`;
  const summary = `${resultLabel}！ ${parts.join(' ')}`;
  const targetText = card.target === 'allEnemies' ? ' → 敵全体' : target ? ` → ${enemyName(target)}` : '';
  addLog(
    state,
    `${ally.name} ${card.name}${targetText} 成功率${chance}%${focusUsed ? `（🌟${focusUsed}）` : ''} → ${results
      .map((r) => SLOT_ICON[r])
      .join('')} = ${resultLabel}：${parts.join(' ')}`,
  );
  events.unshift({ type: 'roll', characterId: ally.id, cardId: card.id, targetId: target?.uid, chance, results, successes, perfect, summary });
  checkEnd(state, events);
  return undefined;
}

/** 消費アイテム（効果の部品を使う。所持の管理は冒険側） */
function useItem(state: BattleState, cmd: Extract<Command, { type: 'USE_ITEM' }>, rng: Rng, events: BattleEvent[]): string | undefined {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  const user = findAlly(state, cmd.characterId);
  if (!user || user.dead) return '使うキャラが戦闘不能です';
  if (user.playerId !== cmd.playerId) return '担当していないキャラです';
  const target = findAlly(state, cmd.targetId);
  if (!target || target.dead) return '対象が戦闘不能です';
  const ctx = makeCtx(state, rng, events, user, { target });
  for (const e of cmd.effects) {
    const why = checkEffect(ctx, e);
    if (why) return why;
  }
  for (const e of cmd.effects) applyEffect(ctx, e);
  addLog(state, `${user.name}が${cmd.itemName}を使った${ctx.parts.length ? `（${ctx.parts.join(' ')}）` : ''}`);
  checkEnd(state, events);
  return undefined;
}

function endTurn(state: BattleState, playerId: string, rng: Rng, events: BattleEvent[]): string | undefined {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  if (!state.allies.some((a) => a.playerId === playerId)) return 'このパーティのプレイヤーではありません';
  for (const a of state.allies) discardHand(a);
  // きっかけ: ターン終了時 → 継続ダメージ → 状態異常を1減らす
  for (const a of state.allies) if (!a.dead) fireAbilities(state, rng, events, a, 'turnEnd');
  tickDamageOverTime(state, 'ally', rng, events);
  for (const a of state.allies) decayStatuses(a.statuses);
  if (checkEnd(state, events)) return undefined;
  // 敵のブロックは敵フェーズ開始時に0へ
  for (const e of state.enemies) e.block = 0;
  state.phase = 'enemy';
  state.enemyCursor = 0;
  addLog(state, `--- 敵フェーズ ---`);
  events.push({ type: 'phase', phase: 'enemy' });
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
  decideAllIntents(state, rng);
  addLog(state, `--- ターン${state.turn + 1} ---`);
  startAllyPhase(state, rng, events);
  return undefined;
}

function executeIntent(state: BattleState, enemy: EnemyState, rng: Rng, events: BattleEvent[]) {
  const intent = enemy.intent;
  if (!intent) return;
  const action = getEnemyAction(enemy.defId, intent.actionId);
  const ctx = makeCtx(state, rng, events, enemy);
  // 演出用のイベントは先に積み、対象の一覧は効果を使った後に埋まる
  events.push({ type: 'enemyAct', enemyUid: enemy.uid, actionName: action.name, targetIds: ctx.hitIds });
  for (const eff of action.effects) applyEffect(ctx, eff);
  for (const n of ctx.fired) abilityTriggered(state, enemy.uid, n, events);
  addLog(state, `${enemyName(enemy)}「${action.name}」${ctx.parts.join(' / ')}`);
  enemy.intent = undefined;
}

/** ユニットのID（味方は id、敵は uid） */
export { unitIdOf };
