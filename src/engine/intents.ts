import { getEnemy, getEnemyAction } from '../data/enemies';
import type { AllyState, BattleEvent, BattleState, EnemyActionDef, EnemyState } from '../types';
import { calcDamage } from './damage';
import type { Rng } from './rng';

export function livingAllies(state: BattleState): AllyState[] {
  return state.allies.filter((a) => !a.dead);
}

export function livingEnemies(state: BattleState): EnemyState[] {
  return state.enemies.filter((e) => !e.dead);
}

/** 単体攻撃を含む行動か（挑発の対象になる） */
export function isSingleAttack(action: EnemyActionDef): boolean {
  return action.effects.some((e) => e.kind === 'attack' && e.target === 'single');
}

/** 単体対象（攻撃・デバフ）を含む行動か */
export function needsTarget(action: EnemyActionDef): boolean {
  return action.effects.some((e) => (e.kind === 'attack' || e.kind === 'debuff') && e.target === 'single');
}

function pickRandomAlly(state: BattleState, rng: Rng): string | undefined {
  const alive = livingAllies(state);
  if (alive.length === 0) return undefined;
  return alive[rng.int(alive.length)].id;
}

/** 次の行動を選ぶ（ルール: 順番 / ランダム・連続制限 / 1ターン目固定 / 単独時の代替） */
export function chooseAction(enemy: EnemyState, state: BattleState, rng: Rng): EnemyActionDef {
  const def = getEnemy(enemy.defId);
  const alone = livingEnemies(state).filter((e) => e.uid !== enemy.uid).length === 0;
  const resolve = (a: EnemyActionDef) =>
    alone && a.fallbackIfAloneId ? getEnemyAction(def.id, a.fallbackIfAloneId) : a;

  if (def.pattern === 'sequence') {
    const a = def.actions[enemy.seqIndex % def.actions.length];
    enemy.seqIndex = (enemy.seqIndex + 1) % def.actions.length;
    return resolve(a);
  }

  if (enemy.history.length === 0 && def.firstActionId) {
    return resolve(getEnemyAction(def.id, def.firstActionId));
  }

  // 単独時の代替を反映した上で、連続制限を満たす候補から選ぶ
  const max = def.maxConsecutive ?? Infinity;
  const recent = enemy.history.slice(-max);
  const blocked = recent.length >= max && recent.every((id) => id === recent[0]) ? recent[0] : undefined;
  const resolved = def.actions.map(resolve);
  const unique = resolved.filter((a, i) => resolved.findIndex((b) => b.id === a.id) === i);
  let candidates = unique.filter((a) => a.id !== blocked);
  if (candidates.length === 0) candidates = unique;
  return candidates[rng.int(candidates.length)];
}

/** インテントを決定する（対象もこの時点でランダムに決めて表示する） */
export function decideIntent(enemy: EnemyState, state: BattleState, rng: Rng): void {
  if (enemy.dead) {
    enemy.intent = undefined;
    return;
  }
  const action = chooseAction(enemy, state, rng);
  enemy.history = [...enemy.history, action.id].slice(-5);
  enemy.intent = { actionId: action.id, targetId: needsTarget(action) ? pickRandomAlly(state, rng) : undefined };
}

export function decideAllIntents(state: BattleState, rng: Rng): void {
  for (const e of state.enemies) decideIntent(e, state, rng);
}

/** 挑発: 敵の単体攻撃インテントの対象を allyId に変える */
export function applyTaunt(enemy: EnemyState, allyId: string, events: BattleEvent[]): void {
  if (enemy.dead || !enemy.intent) return;
  enemy.tauntedBy = allyId;
  const action = getEnemyAction(enemy.defId, enemy.intent.actionId);
  if (isSingleAttack(action) && enemy.intent.targetId !== allyId) {
    enemy.intent = { ...enemy.intent, targetId: allyId };
    events.push({ type: 'retarget', enemyUid: enemy.uid });
  }
}

/** 味方が倒れた時: その味方を狙う・挑発されているインテントを決め直す */
export function retargetAfterDeath(state: BattleState, deadAllyId: string, rng: Rng, events: BattleEvent[]): void {
  for (const e of state.enemies) {
    if (e.tauntedBy === deadAllyId) e.tauntedBy = undefined;
    if (!e.dead && e.intent?.targetId === deadAllyId) {
      e.intent = { ...e.intent, targetId: pickRandomAlly(state, rng) };
      events.push({ type: 'retarget', enemyUid: e.uid });
    }
  }
}

/** 敵の行動が ally に与える予定ダメージ（1回あたりの値の配列。ブロック考慮前） */
export function intentHitsOn(enemy: EnemyState, ally: AllyState): number[] {
  if (enemy.dead || !enemy.intent || ally.dead) return [];
  const action = getEnemyAction(enemy.defId, enemy.intent.actionId);
  const hits: number[] = [];
  for (const eff of action.effects) {
    if (eff.kind !== 'attack') continue;
    if (eff.target === 'single' && enemy.intent.targetId !== ally.id) continue;
    const dmg = calcDamage(eff.amount, enemy.statuses, ally.statuses);
    for (let i = 0; i < eff.hits; i++) hits.push(dmg);
  }
  return hits;
}

/** 被弾予定（インテント合計 − 現在のブロック、0未満にはしない） */
export function incomingDamage(state: BattleState, ally: AllyState): number {
  if (ally.dead) return 0;
  let total = 0;
  for (const e of state.enemies) for (const h of intentHitsOn(e, ally)) total += h;
  return Math.max(0, total - ally.block);
}
