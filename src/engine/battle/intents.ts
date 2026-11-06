import { getEnemy, getEnemyAction } from '../../data/enemies';
import type { AllyState, BattleEvent, BattleState, EnemyActionDef, EnemyState } from '../../types';
import type { Rng } from '../rng';
import type { EnemyAiHandler } from './ai/types';
import { damageModifiers } from '../abilities';
import { calcDamage } from './damage';
import { targetOf } from './effects';
import { tickDamageOf } from './statuses';

export function livingAllies(state: BattleState): AllyState[] {
  return state.allies.filter((a) => !a.dead);
}

export function livingEnemies(state: BattleState): EnemyState[] {
  return state.enemies.filter((e) => !e.dead);
}

/** 単体攻撃を含む行動か（挑発の対象になる） */
export function isSingleAttack(action: EnemyActionDef): boolean {
  return action.effects.some((e) => e.kind === 'damage' && targetOf(e) === 'target');
}

/** 対象（味方1人）を選ぶ効果を含む行動か */
export function needsTarget(action: EnemyActionDef): boolean {
  return action.effects.some((e) => targetOf(e) === 'target');
}

function pickRandomAlly(state: BattleState, rng: Rng): string | undefined {
  const alive = livingAllies(state);
  if (alive.length === 0) return undefined;
  return alive[rng.int(alive.length)].id;
}

/** 今の段階の行動の一覧と選び方 */
export function currentActionSet(enemy: EnemyState) {
  const def = getEnemy(enemy.defId);
  const ph = enemy.phase > 0 ? def.phases?.[enemy.phase - 1] : undefined;
  if (ph) return { actions: ph.actions, pattern: ph.pattern, maxConsecutive: ph.maxConsecutive, firstActionId: undefined };
  return { actions: def.actions, pattern: def.pattern, maxConsecutive: def.maxConsecutive, firstActionId: def.firstActionId };
}

const AIS = new Map<string, EnemyAiHandler>();
for (const [path, mod] of Object.entries(import.meta.glob('./ai/*.ts', { eager: true }) as Record<string, { ai?: EnemyAiHandler }>)) {
  if (!mod.ai) continue; // types.ts
  if (AIS.has(mod.ai.id)) throw new Error(`Duplicate enemy ai: ${mod.ai.id} (${path})`);
  AIS.set(mod.ai.id, mod.ai);
}
export const hasEnemyAi = (id: string) => AIS.has(id);

/** 次の行動を選ぶ（選び方は敵のデータの pattern。ai/ のファイルで増やせる） */
export function chooseAction(enemy: EnemyState, state: BattleState, rng: Rng): EnemyActionDef {
  const set = currentActionSet(enemy);
  const alone = !state.enemies.some((e) => !e.dead && e.uid !== enemy.uid);
  const resolve = (a: EnemyActionDef) => (alone && a.fallbackIfAloneId ? getEnemyAction(enemy.defId, a.fallbackIfAloneId) : a);
  const handler = AIS.get(set.pattern);
  if (!handler) throw new Error(`Unknown enemy ai: ${set.pattern}`);
  return handler.choose(enemy, state, rng, set, resolve);
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

/** 敵の攻撃1回あたりのダメージ（レベル補正・特殊能力・状態異常を反映。ブロック考慮前） */
export function enemyHitDamage(enemy: EnemyState, base: number, target: AllyState | undefined): number {
  return calcDamage(base, enemy.statuses, target?.statuses, damageModifiers(undefined, enemy, undefined, target).multiplier);
}

/** 敵の行動が ally に与える予定ダメージ（1回あたりの値の配列。ブロック考慮前） */
export function intentHitsOn(enemy: EnemyState, ally: AllyState): number[] {
  if (enemy.dead || !enemy.intent || ally.dead) return [];
  const action = getEnemyAction(enemy.defId, enemy.intent.actionId);
  const hits: number[] = [];
  for (const eff of action.effects) {
    if (eff.kind !== 'damage') continue;
    const to = targetOf(eff);
    if (to === 'target' ? enemy.intent.targetId !== ally.id : to !== 'foes') continue;
    const dmg = enemyHitDamage(enemy, eff.amount, ally);
    for (let i = 0; i < (eff.hits ?? 1); i++) hits.push(dmg);
  }
  return hits;
}

/** 継続ダメージの状態異常（毒・火傷など）で次に受けるダメージ（ブロック無視） */
export function dotDamage(ally: AllyState): number {
  return tickDamageOf(ally.statuses);
}

/** 被弾予定（インテント合計 − 現在のブロック ＋ 毒・火傷）。かばう（確率）は含めない */
export function incomingDamage(state: BattleState, ally: AllyState): number {
  if (ally.dead) return 0;
  let total = 0;
  for (const e of state.enemies) for (const h of intentHitsOn(e, ally)) total += h;
  return Math.max(0, total - ally.block) + (state.phase === 'ally' ? dotDamage(ally) : 0);
}
