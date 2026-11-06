// ===== 戦闘のユニット（味方・敵）の共通処理: 名前・ログ・ダメージ・回復・戦闘不能 =====
import { BALANCE } from '../../data/balance';
import { getEnemy } from '../../data/enemies';
import type { AllyState, BattleEvent, BattleState, EnemyState } from '../../types';
import type { Rng } from '../rng';
import { retargetAfterDeath } from './intents';
import { emptyStatuses } from './statuses';

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
  const phaseName = enemy.phase > 0 ? def.phases?.[enemy.phase - 1]?.name : undefined;
  return (phaseName ?? def.name) + (enemy.nameSuffix ? ` ${enemy.nameSuffix}` : '');
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
export function abilityTriggered(state: BattleState, unitId: string, name: string, events: BattleEvent[]) {
  state.stats.abilityTriggers += 1;
  events.push({ type: 'ability', unitId, name });
}

// ---------- 戦闘不能・ボスの段階 ----------

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

/** HPが減った後の処理（0なら戦闘不能、敵ならボスの段階の確認） */
export function afterHpLoss(state: BattleState, u: Unit, rng: Rng, events: BattleEvent[]) {
  if (u.hp <= 0) {
    if (isEnemy(u)) killEnemy(state, u, events);
    else killAlly(state, u, rng, events);
  } else if (isEnemy(u)) checkEnemyPhase(state, u, events);
}

/** HPを直接減らす（ブロック無視。継続ダメージなど）。減った量を返す */
export function loseHp(state: BattleState, u: Unit, amount: number, rng: Rng, events: BattleEvent[]): number {
  if (u.dead || amount <= 0) return 0;
  const loss = Math.min(u.hp, amount);
  u.hp -= loss;
  events.push({ type: 'damage', unitId: unitIdOf(u), amount: loss, blocked: 0 });
  afterHpLoss(state, u, rng, events);
  return loss;
}

export function healUnit(u: Unit, amount: number, events: BattleEvent[]): number {
  if (u.dead) return 0;
  const healed = Math.max(0, Math.min(amount, u.maxHp - u.hp));
  u.hp += healed;
  if (healed > 0) events.push({ type: 'heal', unitId: unitIdOf(u), amount: healed });
  return healed;
}
