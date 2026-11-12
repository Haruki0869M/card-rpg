import { getEnemy, getEnemyAction } from '../../data/enemies';
import type { AllyState, BattleEvent, BattleState, EnemyActionDef, EnemyState } from '../../types';
import type { Rng } from '../rng';
import type { EnemyAiHandler } from './ai/types';
import { damageModifiers } from '../abilities';
import { calcDamage } from './damage';
import { targetOf } from './effects';
import { skipActionStatus, tickDamageOf } from './statuses';
import { canSummonEnemy } from './effects/kinds/summonEnemy';

export function livingAllies(state: BattleState): AllyState[] {
  return state.allies.filter((a) => !a.dead);
}

/** 単体攻撃を含む行動か（挑発の対象になる） */
export function isSingleAttack(action: EnemyActionDef): boolean {
  return action.effects.some((e) => e.kind === 'damage' && targetOf(e) === 'target');
}

/** BREAK されると起きない大技か（ダメージの無い行動: 浄化・仲間を呼ぶ・かばう・癒し封じなど。ダメージのある大技は威力が半分） */
export function breakStopsAction(action: EnemyActionDef): boolean {
  return !!action.big && !action.effects.some((e) => e.kind === 'damage' || e.kind === 'punishPlays');
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

/** 手負い狙いの狙い: HPの割合がいちばん低い、生きている味方（同じ時は並びの前）。乱数は使わない */
export function weakestAlly(state: BattleState): string | undefined {
  const alive = livingAllies(state);
  if (alive.length === 0) return undefined;
  return alive.reduce((a, b) => (b.hp * a.maxHp < a.hp * b.maxHp ? b : a)).id;
}

/** 手負い狙いの行動か（HPが半分以下の相手に倍率がかかる単体攻撃を含む） */
const isHuntAction = (action: EnemyActionDef) => action.effects.some((e) => e.kind === 'damage' && !!e.lowHpMul && targetOf(e) === 'target');

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
  const resolve = (a: EnemyActionDef) => {
    const r = alone && a.fallbackIfAloneId ? getEnemyAction(enemy.defId, a.fallbackIfAloneId) : a;
    // 仲間を呼ぶ: 満員・回数切れで呼べないと分かっている時は、予告の時点で代わりの行動（ふつうの攻撃）にする
    const call = r.effects.find((e) => e.kind === 'summonEnemy' && e.orElse);
    return call && call.kind === 'summonEnemy' && !canSummonEnemy(state, enemy, call) ? getEnemyAction(enemy.defId, call.orElse!) : r;
  };
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
  // 先読みで次の行動が決まっていれば、それを使う（段階が変わって使えない行動なら選び直す）
  const queued = enemy.queuedActionId && currentActionSet(enemy).actions.find((a) => a.id === enemy.queuedActionId);
  enemy.queuedActionId = undefined;
  const action = queued || chooseAction(enemy, state, rng);
  enemy.history = [...enemy.history, action.id].slice(-5);
  // 手負い狙いは、HPの割合がいちばん低い味方を狙う（挑発で変えられる）
  enemy.intent = { actionId: action.id, targetId: needsTarget(action) ? (isHuntAction(action) ? weakestAlly(state) : pickRandomAlly(state, rng)) : undefined };
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
/** extra = 行動の効果に付いた倍率（手負い狙いなど。実際のダメージの extraMultiplier と同じ） */
export function enemyHitDamage(enemy: EnemyState, base: number, target: AllyState | undefined, extra = 1): number {
  return calcDamage(base, enemy.statuses, target?.statuses, damageModifiers(undefined, enemy, undefined, target).multiplier * extra);
}

/** 手負い狙いの倍率（相手のHPが今、最大の半分以下なら lowHpMul） */
export const lowHpMulOn = (lowHpMul: number | undefined, target: AllyState | undefined) => (lowHpMul && target && target.hp * 2 <= target.maxHp ? lowHpMul : 1);

/** 敵の行動が ally に与える予定ダメージ（1回あたりの値の配列。ブロック考慮前） */
export function intentHitsOn(enemy: EnemyState, ally: AllyState): number[] {
  if (enemy.dead || !enemy.intent || ally.dead) return [];
  if (enemy.skipNextAction) return [];
  // 凍結で次の行動を休む敵は攻撃しない
  if (skipActionStatus(enemy.statuses)) return [];
  const action = getEnemyAction(enemy.defId, enemy.intent.actionId);
  const hits: number[] = [];
  for (const eff of action.effects) {
    // 手数読み: このターンに min 枚以上使った味方に（枚数×amount）。使った枚数で予定が変わる
    if (eff.kind === 'punishPlays') {
      if ((ally.played ?? 0) >= eff.min) hits.push(enemyHitDamage(enemy, (ally.played ?? 0) * Math.floor(eff.amount * (enemy.nextActionMultiplier ?? 1)), ally));
      continue;
    }
    if (eff.kind !== 'damage') continue;
    const to = targetOf(eff);
    if (to === 'target' ? enemy.intent.targetId !== ally.id : to !== 'foes') continue;
    const dmg = enemyHitDamage(enemy, Math.floor(eff.amount * (enemy.nextActionMultiplier ?? 1)), ally, lowHpMulOn(eff.lowHpMul, ally));
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
  let shields = ally.summons?.filter(s => s.intercept).length ?? 0;
  for (const e of state.enemies) for (const h of intentHitsOn(e, ally)) {
    if (ally.airborne || (h > 0 && shields-- > 0)) continue;
    total += h;
  }
  return Math.max(0, total - ally.block) + (state.phase === 'ally' ? dotDamage(ally) : 0);
}
