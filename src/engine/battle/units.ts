// ===== 戦闘のユニット（味方・敵）の共通処理: 名前・ログ・ダメージ・回復・戦闘不能 =====
import { BALANCE } from '../../data/balance';
import { fireAbilities, healToBlockOf, enduresOf, rageStackOf } from '../abilities';
import { getEnemy, phasesOf } from '../../data/enemies';
import type { AbilitySource, AllyState, BattleEvent, BattleState, EnemyState } from '../../types';
import type { Rng } from '../rng';
import { fallbackLoneIntents, retargetAfterDeath } from './intents';
import { emptyStatuses, healMultiplier } from './statuses';
import { getStatus } from '../../data/statuses';

export type Unit = AllyState | EnemyState;

export const isEnemy = (u: Unit): u is EnemyState => 'uid' in u;
/** ユニットのID（味方は id、敵は uid） */
export const unitIdOf = (u: Unit): string => (isEnemy(u) ? u.uid : u.id);

export function findAlly(state: BattleState, id: string): AllyState | undefined {
  return state.allies.find((a) => a.id === id);
}

export function findEnemy(state: BattleState, uid: string): EnemyState | undefined {
  return state.enemies.find((e) => e.uid === uid);
}

export const findUnit = (state: BattleState, id: string): Unit | undefined => findAlly(state, id) ?? findEnemy(state, id);

export function enemyName(enemy: EnemyState): string {
  const def = getEnemy(enemy.defId);
  const phaseName = enemy.phase > 0 ? phasesOf(enemy)?.[enemy.phase - 1]?.name : undefined;
  return (def.rare ? '★' : '') + (phaseName ?? def.name) + (enemy.nameSuffix ? ` ${enemy.nameSuffix}` : '');
}

export const nameOf = (u: Unit) => (isEnemy(u) ? enemyName(u) : u.name);

export function unitName(state: BattleState, unitId: string): string {
  const u = findUnit(state, unitId);
  return u ? nameOf(u) : '?';
}

/** 自分の側・相手の側の生存ユニット */
export const sideOf = (state: BattleState, u: Unit): Unit[] => (isEnemy(u) ? state.enemies : state.allies).filter((x) => !x.dead);
export const foesOf = (state: BattleState, u: Unit): Unit[] => (isEnemy(u) ? state.allies : state.enemies).filter((x) => !x.dead);

export function addLog(state: BattleState, text: string) {
  state.log.push({ id: state.nextLogId++, turn: state.turn, text });
  if (state.log.length > BALANCE.logLimit) state.log.splice(0, state.log.length - BALANCE.logLimit);
}

/** 特殊能力の発動（演出・集計用） */
export function abilityTriggered(state: BattleState, unitId: string, name: string, events: BattleEvent[], source?: AbilitySource) {
  state.stats.abilityTriggers += 1;
  events.push({ type: 'ability', unitId, name, ...(source ? { source } : {}) });
}

// ---------- 戦闘不能・ボスの段階 ----------

function killAlly(state: BattleState, ally: AllyState, rng: Rng, events: BattleEvent[]) {
  ally.dead = true;
  ally.block = 0;
  ally.statuses = emptyStatuses();
  addLog(state, `${ally.name}が戦闘不能になった`);
  events.push({ type: 'death', unitId: ally.id });
  for (const a of state.allies) if (!a.dead || a === ally) fireAbilities(state, rng, events, a, 'allyDown', { target: ally });
  if (!ally.dead) return;
  retargetAfterDeath(state, ally.id, rng, events);
}

function killEnemy(state: BattleState, enemy: EnemyState, rng: Rng, events: BattleEvent[]) {
  enemy.dead = true;
  enemy.intent = undefined;
  enemy.tauntedBy = undefined;
  enemy.block = 0;
  delete enemy.guarding;
  addLog(state, `${enemyName(enemy)}を倒した`);
  events.push({ type: 'death', unitId: enemy.uid });
  // かばう相手がいなくなった敵は、予告を代わりの行動（闇の剣）に変える
  fallbackLoneIntents(state, rng, events);
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 相方（同じ段階の出どころ phaseSet を持つ、ほかの敵 = 中ボスの組の相手）が全部倒れたら、
  // 残った方が「相方が倒れると入る段階」に入る。呼ばれた敵・仲間を呼ぶで来た敵は相方に数えない
  if (enemy.summoned) return;
  const partnerOf = (o: EnemyState, x: EnemyState) => x !== o && !x.summoned && x.phaseSet === o.phaseSet;
  for (const o of state.enemies) {
    if (o.dead || o.summoned || state.enemies.some((x) => partnerOf(o, x) && !x.dead)) continue;
    const phases = phasesOf(o);
    const i = phases?.findIndex((p, k) => !!p.onPartnerDown && o.phase < k + 1) ?? -1;
    if (i >= 0) enterPhase(state, o, i, events, '相方が倒れ、');
  }
}

/** 段階 i（0から）に入る: 行動の順番を最初に戻し、ログ・演出。災厄の加護「炉の熱」が掛かった大物なら、味方全員に火傷（2026-11-14） */
function enterPhase(state: BattleState, enemy: EnemyState, i: number, events: BattleEvent[], why = '') {
  const phases = phasesOf(enemy)!;
  enemy.phase = i + 1;
  enemy.seqIndex = 0;
  enemy.history = [];
  addLog(state, `${why}${getEnemy(enemy.defId).name}が「${phases[i].name}」に姿を変えた！`);
  // ボスの段階（2026-11-14）: 次の予告が開幕の一手になる事と、この段階の新しい決まりをログに出す（今の予告は変えない）
  const opening = phases[i].openingActionId ? phases[i].actions.find((a) => a.id === phases[i].openingActionId) : undefined;
  if (opening) addLog(state, `🌀次は「${opening.name}」をしてくる${phases[i].rule ? `（${phases[i].rule}）` : ''}`);
  events.push({ type: 'enemyPhase', enemyUid: enemy.uid, name: phases[i].name });
  const burn = state.boon?.phaseBurn;
  if (burn && state.boon!.uid === enemy.uid) {
    for (const a of state.allies) {
      if (a.dead) continue;
      a.statuses.burn = (a.statuses.burn ?? 0) + burn;
      events.push({ type: 'status', unitId: a.id, status: 'burn', amount: burn });
    }
    addLog(state, `💀炉の熱（業火の魔人の加護）: 味方全員に火傷${burn}`);
  }
}

/** ボスの段階の切り替え（HPが一定以下になったら） */
function checkEnemyPhase(state: BattleState, enemy: EnemyState, events: BattleEvent[]) {
  const phases = phasesOf(enemy);
  if (!phases || enemy.dead) return;
  for (let i = phases.length - 1; i >= 0; i--) {
    if (enemy.phase < i + 1 && enemy.hp * 100 <= enemy.maxHp * phases[i].belowHpPct) {
      enterPhase(state, enemy, i, events);
      return;
    }
  }
}

/** HPが減った後の処理（0なら戦闘不能、敵ならボスの段階の確認） */
export function afterHpLoss(state: BattleState, u: Unit, rng: Rng, events: BattleEvent[]) {
  if (u.hp <= 0) {
    if (isEnemy(u)) killEnemy(state, u, rng, events);
    else killAlly(state, u, rng, events);
  } else if (isEnemy(u)) checkEnemyPhase(state, u, events);
}

/** 味方のHPが減った時の数え: 「敵の番を無傷でしのいだか」を0に戻し、HPが減ると消える状態異常（構え）を消す。乱数は使わない */
export function noteHpLoss(u: Unit, amount = 0) {
  if (isEnemy(u)) return;
  (u.counters ??= {}).unhurt = 0;
  // 区切りD: 血の代価 — このターンに失ったHP（自分たちの番の始めに0に戻る）
  u.counters.hpLostTurn = (u.counters.hpLostTurn ?? 0) + amount;
  // 段階7a: 狂王の血鎧 — HPが減るたび、次の攻撃カード1枚の倍率をためる（上限まで。使うと playCard で0に戻る）
  const rage = amount > 0 ? rageStackOf(u) : undefined;
  if (rage) u.counters.rageAtkPct = Math.min(rage.effect.max, (u.counters.rageAtkPct ?? 0) + rage.effect.pct);
  for (const [id, n] of Object.entries(u.statuses)) if (n && getStatus(id).loseOnHpLoss) u.statuses[id] = 0;
}

/** HPを直接減らす（ブロック無視。継続ダメージなど）。減った量を返す */
export function loseHp(state: BattleState, u: Unit, amount: number, rng: Rng, events: BattleEvent[]): number {
  if (u.dead || amount <= 0) return 0;
  // 区切りD: 命綱 — HPは1より下がらない
  const floor = enduresOf(u) ? 1 : 0;
  const loss = Math.max(0, Math.min(u.hp - floor, amount));
  u.hp -= loss;
  noteHpLoss(u, loss);
  events.push({ type: 'damage', unitId: unitIdOf(u), amount: loss, blocked: 0 });
  afterHpLoss(state, u, rng, events);
  return loss;
}

export function healUnit(u: Unit, amount: number, events: BattleEvent[]): number {
  if (u.dead) return 0;
  // 呪いなど: 受ける回復量の倍率
  const amt = Math.floor(amount * healMultiplier(u.statuses) + 1e-9);
  const healed = Math.max(0, Math.min(amt, u.maxHp - u.hp));
  u.hp += healed;
  if (healed > 0) events.push({ type: 'heal', unitId: unitIdOf(u), amount: healed });
  // 福音など: 回復した量の一部が、ブロックにもなる
  const toBlock = healed > 0 ? healToBlockOf(u) : undefined;
  const gain = toBlock ? Math.floor(healed * toBlock.pct) : 0;
  if (gain > 0) {
    u.block += gain;
    events.push({ type: 'block', unitId: unitIdOf(u), amount: gain });
    events.push({ type: 'ability', unitId: unitIdOf(u), name: toBlock!.ability.name, ...(toBlock!.ability.source ? { source: toBlock!.ability.source } : {}) });
  }
  return healed;
}
