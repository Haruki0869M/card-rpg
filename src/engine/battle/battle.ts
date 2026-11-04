// ===== 戦闘エンジン（Reactに依存しない純粋関数） =====
// applyCommand(state, command) => { state, events }
// 入力の state は変更しない（内部で複製してから書き換える）。

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
  CardEffect,
  CardInstance,
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
import { applyTaunt, decideAllIntents, enemyHitDamage, livingAllies, livingEnemies, retargetAfterDeath } from './intents';
import { finalChance, selectTier } from './probability';

export const STATE_VERSION = 3;

export const emptyStatuses = (): Statuses => ({ vulnerable: 0, weak: 0, burn: 0, poison: 0 });

export const STATUS_NAMES: Record<StatusId, string> = { vulnerable: '脆弱', weak: '弱体', burn: '火傷', poison: '毒' };


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
      statuses: { ...emptyStatuses(), ...m.statuses },
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
  const def = getEnemy(enemy.defId);
  const phaseName = enemy.phase > 0 ? def.phases?.[enemy.phase - 1]?.name : undefined;
  return (phaseName ?? def.name) + (enemy.nameSuffix ? ` ${enemy.nameSuffix}` : '');
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
    const { reshuffled } = drawCards(a, BALANCE.drawPerTurn + a.extraDraw, rng);
    if (reshuffled) addLog(state, `${a.name}: 捨札をシャッフルして山札に戻した`);
  }
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

function decrementStatuses(s: Statuses) {
  s.vulnerable = Math.max(0, s.vulnerable - 1);
  s.weak = Math.max(0, s.weak - 1);
}

function abilityTriggered(state: BattleState, unitId: string, name: string, events: BattleEvent[]) {
  state.stats.abilityTriggers += 1;
  events.push({ type: 'ability', unitId, name });
}

// ---------- ダメージ・死亡 ----------

function killAlly(state: BattleState, ally: AllyState, rng: Rng, events: BattleEvent[]) {
  ally.dead = true;
  ally.block = 0;
  ally.statuses = emptyStatuses();
  addLog(state, `${ally.name}が戦闘不能になった`);
  events.push({ type: 'death', unitId: ally.id });
  retargetAfterDeath(state, ally.id, rng, events);
}

function killEnemy(state: BattleState, enemy: EnemyState, events: BattleEvent[]) {
  enemy.dead = true;
  enemy.intent = undefined;
  enemy.tauntedBy = undefined;
  enemy.block = 0;
  addLog(state, `${enemyName(enemy)}を倒した`);
  events.push({ type: 'death', unitId: enemy.uid });
}

/** ボスの段階の切り替え（HPが一定以下になったら） */
function checkEnemyPhase(state: BattleState, enemy: EnemyState, events: BattleEvent[]) {
  const phases = getEnemy(enemy.defId).phases;
  if (!phases || enemy.dead) return;
  for (let i = phases.length - 1; i >= 0; i--) {
    if (enemy.phase < i + 1 && enemy.hp * 100 <= enemy.maxHp * phases[i].belowHpPct) {
      enemy.phase = i + 1;
      enemy.seqIndex = 0;
      enemy.history = [];
      addLog(state, `${getEnemy(enemy.defId).name}が「${phases[i].name}」に姿を変えた！`);
      events.push({ type: 'enemyPhase', enemyUid: enemy.uid, name: phases[i].name });
      return;
    }
  }
}

/** 敵にダメージ（計算済みの値）を与える。HPに入った量を返す */
function hitEnemy(state: BattleState, enemy: EnemyState, dmg: number, sourceId: string, events: BattleEvent[]): number {
  if (enemy.dead) return 0;
  const r = absorb(dmg, enemy.block, enemy.hp);
  enemy.block = r.block;
  enemy.hp = r.hp;
  events.push({ type: 'damage', unitId: enemy.uid, amount: r.hpLoss, blocked: r.blocked, sourceId });
  state.stats.totalDamage += r.hpLoss;
  if (enemy.hp <= 0) killEnemy(state, enemy, events);
  else checkEnemyPhase(state, enemy, events);
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
  if (victim.hp <= 0) killAlly(state, victim, rng, events);
  return { victim, hpLoss: r.hpLoss };
}

/** 毒・火傷のダメージ（ブロックを無視）→ 毒は1減る、火傷も1減る */
function tickDamageOverTime(state: BattleState, side: 'ally' | 'enemy', rng: Rng, events: BattleEvent[]) {
  const units = side === 'ally' ? state.allies : state.enemies;
  for (const u of units) {
    if (u.dead) continue;
    let dmg = 0;
    if (u.statuses.poison > 0) {
      dmg += u.statuses.poison;
      u.statuses.poison -= 1;
    }
    if (u.statuses.burn > 0) {
      dmg += BALANCE.burnDamage;
      u.statuses.burn -= 1;
    }
    if (dmg <= 0) continue;
    const loss = Math.min(u.hp, dmg);
    u.hp -= loss;
    const id = 'uid' in u ? u.uid : u.id;
    events.push({ type: 'damage', unitId: id, amount: loss, blocked: 0 });
    addLog(state, `${'uid' in u ? enemyName(u) : u.name}は毒・火傷で${loss}ダメージ`);
    if (u.hp <= 0) {
      if ('uid' in u) killEnemy(state, u, events);
      else killAlly(state, u, rng, events);
    } else if ('uid' in u) checkEnemyPhase(state, u, events);
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
      error = useItem(state, cmd, events);
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

function healUnit(ally: AllyState, amount: number, events: BattleEvent[]): number {
  if (ally.dead) return 0;
  const healed = Math.min(amount, ally.maxHp - ally.hp);
  ally.hp += healed;
  if (healed > 0) events.push({ type: 'heal', unitId: ally.id, amount: healed });
  return healed;
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
  const card = cardOf(inst);
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
  /** ダメージ・状態異常を与える相手（全体攻撃なら生存中の全員） */
  const victims = () => (card.target === 'allEnemies' ? livingEnemies(state) : target && !target.dead ? [target] : []);

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
        for (const v of victims()) dealt += hitEnemy(state, v, calcDamage(eff.amount, ally.statuses, v.statuses, dmgMul.multiplier), ally.id, events);
        break;
      case 'block':
        ally.block += eff.amount;
        events.push({ type: 'block', unitId: ally.id, amount: eff.amount });
        parts.push(`${eff.amount} BLOCK`);
        break;
      case 'blockAllies':
        for (const a of livingAllies(state)) {
          a.block += eff.amount;
          events.push({ type: 'block', unitId: a.id, amount: eff.amount });
        }
        parts.push(`全員 ${eff.amount} BLOCK`);
        break;
      case 'healAllies':
        for (const a of livingAllies(state)) healUnit(a, eff.amount, events);
        parts.push(`全員 回復${eff.amount}`);
        break;
      case 'applyStatus': {
        const vs = victims();
        for (const v of vs) {
          v.statuses[eff.status] += eff.amount;
          events.push({ type: 'status', unitId: v.uid, status: eff.status, amount: eff.amount });
        }
        if (vs.length) parts.push(`${STATUS_NAMES[eff.status]}${eff.amount}`);
        break;
      }
      case 'gainMana':
        ally.mana += eff.amount;
        parts.push(`マナ+${eff.amount}`);
        break;
      case 'gainFocus': {
        const before = ally.focus;
        ally.focus = Math.min(ally.focusMax, ally.focus + eff.amount);
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
      } else if (e.kind === 'onPerfectApplyStatus' && hasDamage) {
        const vs = victims();
        if (!vs.length) continue;
        abilityTriggered(state, ally.id, ab.name, events);
        for (const v of vs) {
          v.statuses[e.status] += e.amount;
          events.push({ type: 'status', unitId: v.uid, status: e.status, amount: e.amount });
        }
        parts.push(`${ab.name}`);
        addLog(state, `${ally.name}の「${ab.name}」！ ${STATUS_NAMES[e.status]}${e.amount}`);
      }
    }
  }

  state.stats.maxDamage = Math.max(state.stats.maxDamage, dealt);
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

function useItem(state: BattleState, cmd: Extract<Command, { type: 'USE_ITEM' }>, events: BattleEvent[]): string | undefined {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  const user = findAlly(state, cmd.characterId);
  if (!user || user.dead) return '使うキャラが戦闘不能です';
  if (user.playerId !== cmd.playerId) return '担当していないキャラです';
  const target = findAlly(state, cmd.targetId);
  if (!target || target.dead) return '対象が戦闘不能です';
  const e = cmd.effect;
  switch (e.kind) {
    case 'heal': {
      if (target.hp >= target.maxHp) return 'HPは満タンです';
      const h = healUnit(target, e.amount, events);
      addLog(state, `${user.name}が${cmd.itemName}を使った（${target.name}のHP+${h}）`);
      break;
    }
    case 'focus': {
      if (target.focus >= target.focusMax) return 'フォーカスは最大です';
      const before = target.focus;
      target.focus = Math.min(target.focusMax, target.focus + e.amount);
      addLog(state, `${user.name}が${cmd.itemName}を使った（${target.name}のフォーカス+${target.focus - before}）`);
      break;
    }
    case 'cleanse': {
      const s = target.statuses;
      if (!s.weak && !s.vulnerable && !s.poison && !s.burn) return '治す状態異常がありません';
      target.statuses = emptyStatuses();
      addLog(state, `${user.name}が${cmd.itemName}を使った（${target.name}の状態異常が治った）`);
      break;
    }
    case 'escape':
      state.phase = 'escaped';
      addLog(state, `${user.name}が${cmd.itemName}を使った。戦闘から逃げ出した！`);
      events.push({ type: 'phase', phase: 'escaped' });
      break;
  }
  return undefined;
}

function endTurn(state: BattleState, playerId: string, rng: Rng, events: BattleEvent[]): string | undefined {
  if (state.phase !== 'ally') return '味方フェーズではありません';
  if (!state.allies.some((a) => a.playerId === playerId)) return 'このパーティのプレイヤーではありません';
  for (const a of state.allies) discardHand(a);
  // 味方側の毒・火傷 → 状態異常を1減らす
  tickDamageOverTime(state, 'ally', rng, events);
  for (const a of state.allies) decrementStatuses(a.statuses);
  if (checkEnd(state, events)) return undefined;
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

  // 敵フェーズ終了: 毒・火傷 → 状態異常を1減らす → 挑発解除 → 次のインテント → 味方フェーズ
  tickDamageOverTime(state, 'enemy', rng, events);
  if (checkEnd(state, events)) return undefined;
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
        const targets =
          eff.target === 'all'
            ? livingAllies(state)
            : [findAlly(state, enemy.intent?.targetId ?? '')].filter((a): a is AllyState => !!a && !a.dead);
        for (const t of targets) {
          t.statuses[eff.status] += eff.amount;
          if (!targetIds.includes(t.id)) targetIds.push(t.id);
          events.push({ type: 'status', unitId: t.id, status: eff.status, amount: eff.amount });
        }
        if (targets.length) logParts.push(`${eff.target === 'all' ? '全員' : targets[0].name}に${STATUS_NAMES[eff.status]}${eff.amount}`);
        break;
      }
    }
  }
  addLog(state, `${enemyName(enemy)}「${action.name}」${logParts.join(' / ')}`);
  enemy.intent = undefined;
}
