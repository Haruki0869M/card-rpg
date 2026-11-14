// ===== 効果の部品の登録表と、共通の処理（対象の決め方・ダメージの与え方） =====
// 新しい効果: kinds/ にファイルを1つ置いて export const effect: EffectHandler<'種類'> = {...} と書くだけ。
// カード・敵の行動・消費アイテム・特殊能力のデータから、その日から使える。
import type { AbilityDef, BattleEvent, BattleState, CardDef, Effect, EffectTarget, EnemyState } from '../../../types';
import { cardModifier, convertedElement, coverChance, damageModifiers, elementGuardOf, enduresOf, fireAbilities, guardStatus, statusBonusOf, testConditions } from '../../abilities';
import type { Rng } from '../../rng';
import { BALANCE } from '../../../data/balance';
import { getElement } from '../../../data/elements';
import { getEnemy, getEnemyAction } from '../../../data/enemies';
import { enemyWeak, isResistTo, isWeakTo } from '../phases';
import { getStatus } from '../../../data/statuses';
import { absorb, calcDamage } from '../damage';
import { addStatus } from '../statuses';
import { attackElement } from '../cardState';
import { abilityTriggered, addLog, afterHpLoss, findAlly, foesOf, healUnit, isEnemy, nameOf, noteHpLoss, sideOf, type Unit, unitIdOf } from '../units';
import { recordActivation, type EffectCtx, type EffectHandler } from './types';

export type { EffectCtx, EffectHandler } from './types';

const HANDLERS = new Map<string, EffectHandler>();
for (const [path, mod] of Object.entries(import.meta.glob('./kinds/*.ts', { eager: true }) as Record<string, { effect?: EffectHandler }>).sort(([a], [b]) => a.localeCompare(b))) {
  const h = mod.effect;
  if (!h) throw new Error(`effect file without "export const effect": ${path}`);
  if (HANDLERS.has(h.kind)) throw new Error(`Duplicate effect kind: ${h.kind}`);
  HANDLERS.set(h.kind, h as EffectHandler);
}

/** 効果の種類の処理（未登録ならエラー） */
export function effectHandler(kind: string): EffectHandler {
  const h = HANDLERS.get(kind);
  if (!h) throw new Error(`Unknown effect kind: ${kind}`);
  return h;
}
export const hasEffectKind = (kind: string) => HANDLERS.has(kind);

/** 効果の対象（省略時は種類ごとの既定） */
export const targetOf = (e: Effect): EffectTarget => e.to ?? effectHandler(e.kind).defaultTo;

export function makeCtx(
  state: BattleState,
  rng: Rng,
  events: BattleEvent[],
  source: Unit,
  opts: { target?: Unit; allyTarget?: Unit; attacker?: Unit; card?: CardDef; cardAbilities?: AbilityDef[]; dealt?: number; depth?: number; perfect?: boolean; tierEffects?: Effect[]; via?: 'pet' | 'summon'; weakTarget?: Unit; helped?: Unit[]; statusId?: string } = {},
): EffectCtx {
  return {
    state,
    rng,
    events,
    source,
    target: opts.target,
    allyTarget: opts.allyTarget,
    attacker: opts.attacker,
    card: opts.card,
    cardAbilities: opts.cardAbilities,
    perfect: opts.perfect,
    tierEffects: opts.tierEffects,
    via: opts.via,
    weakTarget: opts.weakTarget,
    helped: opts.helped,
    dealt: opts.dealt ?? 0,
    ...(opts.statusId ? { statusId: opts.statusId } : {}),
    parts: [],
    hitIds: [],
    fired: [],
    depth: opts.depth ?? 0,
  };
}

/** 対象を決める（生存しているユニットだけ） */
export function resolveTargets(ctx: EffectCtx, to: EffectTarget): Unit[] {
  const { state, source } = ctx;
  switch (to) {
    case 'allyTarget':
      return ctx.allyTarget && !ctx.allyTarget.dead ? [ctx.allyTarget] : [];
    case 'self':
      return source.dead ? [] : [source];
    case 'allies':
      return sideOf(state, source);
    case 'otherAllies':
      return sideOf(state, source).filter((u) => u !== source);
    case 'foes':
      return foesOf(state, source);
    case 'attacker':
      // 攻撃してきた相手（ダメージを受けた時・防いだ時のきっかけ。毒などの継続ダメージには相手がいない）
      return ctx.attacker && !ctx.attacker.dead && isEnemy(ctx.attacker) !== isEnemy(source) ? [ctx.attacker] : [];
    case 'weakHit':
      return ctx.weakTarget && !ctx.weakTarget.dead ? [ctx.weakTarget] : [];
    case 'helped':
      return (ctx.helped ?? []).filter((u) => !u.dead);
    case 'otherFoes':
      // 狙った敵以外の敵全員（感電など）
      return foesOf(state, source).filter((u) => u !== ctx.target);
    case 'lowestAlly': {
      // 味方で、HPの割合が一番低い1人
      const alive = sideOf(state, source).filter((u) => !u.dead);
      return alive.length ? [alive.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a))] : [];
    }
    case 'randomFoe': {
      const alive = foesOf(state, source);
      return alive.length ? [alive[ctx.rng.int(alive.length)]] : [];
    }
    case 'randomAlly': {
      const alive = sideOf(state, source).filter((u) => !u.dead);
      return alive.length ? [alive[ctx.rng.int(alive.length)]] : [];
    }
    case 'target': {
      if (ctx.card?.target === 'allEnemies') return foesOf(state, source);
      // 敵の行動: 挑発や味方の戦闘不能で対象が変わるので、毎回インテントを読み直す
      const t = isEnemy(source) && source.intent ? findAlly(state, source.intent.targetId ?? '') : ctx.target;
      return t && !t.dead ? [t] : [];
    }
  }
}

/** 効果を1つ使う。何か起きたら true */
export function applyEffect(ctx: EffectCtx, e: Effect): boolean {
  return effectHandler(e.kind).apply(ctx, e as never);
}

/** アイテムとして使えるか（使えなければ理由） */
export function checkEffect(ctx: EffectCtx, e: Effect): string | null {
  return effectHandler(e.kind).check?.(ctx, e as never) ?? null;
}

const WHO: Record<EffectTarget, { ally: string; enemy: string }> = {
  target: { ally: '対象に', enemy: '対象に' },
  allyTarget: { ally: '選んだ味方に', enemy: '選んだ敵に' },
  self: { ally: '自分に', enemy: '自分に' },
  allies: { ally: '味方全員に', enemy: '敵全員に' },
  otherAllies: { ally: '他の味方全員に', enemy: '他の敵全員に' },
  foes: { ally: '敵全員に', enemy: '味方全員に' },
  otherFoes: { ally: '他の敵全員に', enemy: '他の味方全員に' },
  attacker: { ally: '攻撃してきた相手に', enemy: '攻撃してきた相手に' },
  randomFoe: { ally: 'ランダムな敵1体に', enemy: 'ランダムな味方1人に' },
  lowestAlly: { ally: 'HPが一番低い味方に', enemy: 'HPが一番低い敵に' },
  randomAlly: { ally: 'ランダムな味方1人に', enemy: 'ランダムな敵1体に' },
  weakHit: { ally: '弱点を突いた敵に', enemy: '弱点を突いた相手に' },
  helped: { ally: '支援した味方に', enemy: '支援した相手に' },
};

/** 効果の説明文（side = 使う側。味方なら「敵全員に」、敵なら「味方全員に」） */
export function describeEffect(e: Effect, side: 'ally' | 'enemy' = 'ally', card?: CardDef): string {
  const to = targetOf(e);
  const who = to === 'target' && card?.target === 'allEnemies' ? WHO.foes[side] : to === 'target' && card && ['ally', 'otherAlly', 'fallenAlly'].includes(card.target) ? '選んだ味方に' : WHO[to][side];
  return effectHandler(e.kind).describe(e as never, who);
}

/** カードの短い表示の数値 */
export const effectShort = (e: Effect): string => effectHandler(e.kind).short?.(e as never) ?? '';

/** 強化した効果 */
export function upgradeEffect(e: Effect): Effect {
  const h = effectHandler(e.kind);
  return h.upgrade ? (h.upgrade(e as never) as Effect) : e;
}

// ---------- 属性（弱点・耐性。spec §14） ----------

/** 属性のダメージ倍率（敵の弱点×1.5・耐性×0.5。無属性・味方は1） */
export function elementMultiplier(victim: Unit | undefined, element: string | undefined): number {
  if (!element || !victim || !isEnemy(victim)) return 1;
  if (isResistTo(victim, element)) return BALANCE.elementResistMul;
  if (isWeakTo(victim, element)) return BALANCE.elementWeakMul;
  return 1;
}

/** 連携攻撃（M3-C5）: このターンに別の味方が攻撃した敵には、ダメージが上乗せされる */
export const COMBO_NAME = '連携';
/** 連携の段階の名前（1 = 連携 / 2 = 大連携 / 3 = 極連携） */
export const COMBO_NAMES = ['', '連携', '大連携', '極連携'] as const;
/** 連携の段階: このターンに、その敵を先に攻撃した「別の味方」の人数（上限は表の長さ。0 = 連携なし） */
export function comboStage(source: Unit | undefined, victim: Unit | undefined): number {
  if (!source || !victim || isEnemy(source) || !isEnemy(victim)) return 0;
  const id = unitIdOf(source);
  let n = victim.hitBy?.filter((x) => x !== id).length ?? 0;
  // 区切りD: 挟撃の陣の敵は、1人でも連携になる。アシスト・パスは段階+1
  if (victim.pincer) n = Math.max(n, 1);
  n += source.comboBoost ?? 0;
  return Math.min(BALANCE.comboBonus.length - 1, n);
}
/** 連携の段階の上乗せ（0.2 / 0.35 / 0.5） */
export const comboBonusOf = (stage: number) => BALANCE.comboBonus[Math.max(0, Math.min(BALANCE.comboBonus.length - 1, stage))] ?? 0;
export function comboMultiplier(source: Unit | undefined, victim: Unit | undefined, scale = 1): number {
  // 区切りD: ファイナル・ユニゾンなど、連携の上乗せの倍率。合計は +200% まで
  return 1 + Math.min(BALANCE.comboBonusMax, comboBonusOf(comboStage(source, victim)) * scale);
}

// ---------- BREAK（大技の予告を崩す。抜本的な見直し §3-2） ----------

/** その敵が今、大技の予告を出しているか（崩せる状態か。もう崩した・倒れた・予告が無い時は false） */
export function canBreak(enemy: Unit | undefined): boolean {
  if (!enemy || !isEnemy(enemy) || enemy.dead || enemy.broken || !enemy.intent) return false;
  return !!getEnemyAction(enemy.defId, enemy.intent.actionId).big;
}

/** その敵が今予告している行動が、特殊な行動（紫の札。行動のデータに behavior が付いている物）か */
export function intentIsBehavior(enemy: Unit | undefined): boolean {
  if (!enemy || !isEnemy(enemy) || !enemy.intent) return false;
  return !!getEnemyAction(enemy.defId, enemy.intent.actionId).behavior;
}

/** 紫の札（特殊な行動）の予告に「弱点の属性で、しかも完全成功」の決まりを当てるか（BALANCE.breakBehaviorNeedsWeakPerfect） */
export const behaviorNeedsWeakPerfect = (enemy: Unit | undefined) => BALANCE.breakBehaviorNeedsWeakPerfect && intentIsBehavior(enemy);

/**
 * 「合計ダメージで BREAK」の線（%）。敵の格（ボス・中ボスと災厄・強敵・ふつう）ごとに BALANCE.breakDamagePctByRank で変えられる。書いていなければ breakDamagePct。
 * 敵が紫の札（特殊な行動）を予告している時は BALANCE.breakDamagePctBehavior（書いてあれば）。enemy を渡さない時は格だけで見る
 */
export function breakDamagePctOf(state: BreakRankState, enemy?: Unit): number {
  if (BALANCE.breakDamagePctBehavior !== undefined && intentIsBehavior(enemy)) return BALANCE.breakDamagePctBehavior;
  // 2026-11-13（pre-deploy19 の問題 A2・オーナーの OK）: 1つ目の鍵のダンジョンのボスは、今までどおり（格ごとの線を使わない）
  if (state.firstKeyBoss) return BALANCE.breakDamagePct;
  return BALANCE.breakDamagePctByRank[battleRankOf(state)] ?? BALANCE.breakDamagePct;
}

/** BREAK の決まりが見る、戦闘の格の情報（firstKeyBoss = 各シナリオの、鍵の順番で1つ目のダンジョンのボスの戦闘） */
export type BreakRankState = Pick<BattleState, 'boss' | 'midboss' | 'elite' | 'firstKeyBoss'> & Partial<Pick<BattleState, 'insight'>>;

/** 戦闘の敵の格（ボス・中ボスと災厄・強敵・ふつう） */
export const battleRankOf = (state: Pick<BattleState, 'boss' | 'midboss' | 'elite'>) => (state.boss ? 'boss' : state.midboss ? 'midboss' : state.elite ? 'elite' : 'normal');

/**
 * この敵の予告に「弱点の属性で、しかも完全成功」の決まりを当てるか（2026-11-13 docs/tasks/break-read-plan.md §2）:
 * - 紫の札（特殊な行動）の予告 → どの戦闘でも（BALANCE.breakBehaviorNeedsWeakPerfect）
 * - ボス・中ボス・災厄の戦闘 → BALANCE.breakNeedsWeakPerfect・breakNeedsWeakPerfectRanks
 *   ただし、各シナリオの鍵の順番で1つ目のダンジョンのボスの戦闘（firstKeyBoss）は当てない（今までどおり。紫の札は上のとおり当てる）
 * enemy を渡さない時は、戦闘の格だけで見る（ヘルプの文など）
 */
export function needsWeakPerfect(state: BreakRankState, enemy?: Unit): boolean {
  // 見破り（2026-11-14 寄り道の値打ち 柱2）: 見破ったボスの戦闘では、そのボス（大物）の大技と開幕の一手（紫の札も）は、完全成功だけで崩れる
  if (state.insight && enemy && isEnemy(enemy) && enemy.uid === state.insight) return false;
  if (behaviorNeedsWeakPerfect(enemy)) return true;
  if (!BALANCE.breakNeedsWeakPerfect) return false;
  if (state.firstKeyBoss) return false;
  const ranks = BALANCE.breakNeedsWeakPerfectRanks;
  return !ranks || ranks.includes(battleRankOf(state));
}

/**
 * 完全成功の一撃の中身（つまみの測定2で足した決まりが読む。既定の値では読まない）。
 * card = 使ったカード / focusUsed = 使ったフォーカス / hasWeakCard = その味方が、その敵の弱点を突けるカードを持っているか（breakRules.ts）
 */
export interface PerfectTry { card?: CardDef; focusUsed?: number; hasWeakCard?: () => boolean }

/** 完全成功だけで、この敵を崩せるか（BALANCE.breakPerfectByRank・breakNeedsWeakPerfect。既定では、いつも true） */
export function perfectAloneBreaks(state: BreakRankState, enemy: Unit, t: PerfectTry = {}): boolean {
  if ((BALANCE.breakPerfectByRank[battleRankOf(state)] ?? true) === false) return false;
  if (needsWeakPerfect(state, enemy)) {
    // 「弱点で、しかも完全成功」の決まりでも、弱点を持たない敵は完全成功だけで崩れる（崩す手が無くならないように）
    if (!isEnemy(enemy)) return false;
    if (!enemyWeak(enemy).length && !enemy.tempWeak) return true;
    // つまみの測定2（イ）: 弱点を突けるカードを1枚も持たない味方は、完全成功で崩せる
    if (BALANCE.breakPerfectNoWeakCard && t.hasWeakCard && !t.hasWeakCard()) return true;
    // つまみの測定2（エ）: 重い一撃（枠が多いカード・フォーカスを多く使った）の完全成功は崩せる
    const h = BALANCE.breakPerfectHeavy;
    if (h && t.card && (t.card.slots >= h.slots || (t.focusUsed ?? 0) >= h.focus)) return true;
    return false;
  }
  return true;
}

/**
 * BREAK のきっかけ（無ければ undefined）。perfect = カードの完全成功、early = カードの能力で「成功1でも崩せる」（魔力の楔）。
 * 既定（BALANCE の今の値）では「弱点 → 完全成功 → 合計ダメージ」の順で、前と全く同じ
 */
function breakReason(state: BattleState, enemy: EnemyState, weakHit: boolean, perfect: boolean, early: boolean, t: PerfectTry = {}): 'weak' | 'perfect' | 'damage' | undefined {
  const byDamage = (enemy.turnDamage ?? 0) * 100 >= enemy.maxHp * breakDamagePctOf(state, enemy);
  if (needsWeakPerfect(state, enemy)) {
    if (weakHit && perfect) return 'weak';
    if (early || (perfect && perfectAloneBreaks(state, enemy, t))) return 'perfect';
    return byDamage ? 'damage' : undefined;
  }
  return weakHit ? 'weak' : early || (perfect && perfectAloneBreaks(state, enemy, t)) ? 'perfect' : byDamage ? 'damage' : undefined;
}

/** 大技の予告を崩す: 威力が半分・脆弱1（balance の breakStatus。2026-11-13 に弱体から変えた）・ブロック0（オーナーの決定 3-A）。乱数は使わない */
export function breakEnemy(ctx: EffectCtx, enemy: EnemyState, why: 'weak' | 'perfect' | 'damage') {
  // 災厄の加護「凍てつく守り」（2026-11-14）: 大物への最初の BREAK が1回だけ効かない（この予告はもう崩せない = broken。次の予告からまた崩せる）
  const bo = ctx.state.boon;
  if (bo?.ward && !bo.wardUsed && bo.uid === enemy.uid) {
    bo.wardUsed = true;
    enemy.broken = true;
    ctx.events.push({ type: 'ability', unitId: enemy.uid, name: '凍てつく守り' });
    ctx.parts.push('凍てつく守りが BREAK を防いだ');
    addLog(ctx.state, `💀凍てつく守り（氷嵐の魔女の加護）: ${nameOf(enemy)}への BREAK を1回防いだ（次の予告からは崩せる）`);
    return;
  }
  enemy.broken = true;
  enemy.nextActionMultiplier = (enemy.nextActionMultiplier ?? 1) * BALANCE.breakPower;
  if (BALANCE.breakClearsBlock) enemy.block = 0;
  ctx.events.push({ type: 'break', enemyUid: enemy.uid, why });
  // 付ける状態は balance の breakStatus（2026-11-13 から脆弱）
  const st = BALANCE.breakStatus;
  addStatus(enemy.statuses, st, BALANCE.breakWeak);
  ctx.events.push({ type: 'status', unitId: enemy.uid, status: st, amount: BALANCE.breakWeak });
  ctx.parts.push('BREAK！');
  // 代償（2026-11-14 開幕の一手）: この予告を崩した味方に、その場で小さな効果（敵からの効果）
  const act = enemy.intent ? getEnemyAction(enemy.defId, enemy.intent.actionId) : undefined;
  if (act?.breakBacklash?.length && !isEnemy(ctx.source) && !ctx.source.dead && ctx.depth < 3) {
    const back = makeCtx(ctx.state, ctx.rng, ctx.events, enemy, { attacker: ctx.source, depth: ctx.depth + 1 });
    for (const eff of act.breakBacklash) applyEffect(back, eff);
    if (back.parts.length) addLog(ctx.state, `${nameOf(enemy)}を崩した反動: ${back.parts.join(' / ')}`);
  }
  // 数え読み（ボスの段階・2026-11-14）: 数えている間に崩すと、1つ戻る（最初の数まで。数え読みの行動そのものの予告では戻らない）
  const cd = enemy.countdown;
  if (cd && !enemy.intent?.countdownFire && cd.left < cd.turns) cd.left += 1;
  addLog(ctx.state, `⚡BREAK！ ${nameOf(enemy)}の体勢が崩れた（次の行動の威力が半分・${getStatus(st).name}${BALANCE.breakWeak}${BALANCE.breakClearsBlock ? '・ブロック0' : ''}）`);
}

/** 属性を強める状態異常（聖光など）の倍率。使った分は消す */
function elementBoost(source: Unit, element: string, turn: number): number {
  let m = 1;
  // 区切りD: 光の蓄え — このターンは聖光が消えない
  const keep = !isEnemy(source) && source.holdLight === turn;
  for (const [id, n] of Object.entries(source.statuses)) {
    if (!n) continue;
    const b = getStatus(id).boostElement;
    if (b?.element !== element) continue;
    m *= 1 + b.per * n;
    if (!keep) source.statuses[id] = 0;
  }
  return m;
}

/** その属性に耐性があるか（状態異常が効かない） */
export const resistsElement = (victim: Unit, element: string) => isEnemy(victim) && isResistTo(victim, element);

// ---------- かばう形（2026-11-14 特殊な行動のばらし） ----------

/** かばっている敵 guard が、ほかの敵 victim への一撃を代わりに受けるか（かばう形 guardStyle の決まり。乱数は使わない） */
export function guardCovers(state: BattleState, guard: EnemyState, victim: EnemyState): boolean {
  const st = guard.guardStyle;
  if (!st) return true;
  // 崩れるまで（土人形）: 自分のブロックが0なら、もうかばわない
  if (st.untilBlockGone && guard.block <= 0) return false;
  // 傷ついた仲間だけ（氷の騎士）: HPの割合がいちばん低い、ほかの生きている敵（同じなら並びの前）だけ
  if (st.cover === 'weakest') {
    const others = state.enemies.filter((e) => !e.dead && e !== guard);
    const low = others.reduce<EnemyState | undefined>((a, b) => (!a || b.hp * a.maxHp < a.hp * b.maxHp ? b : a), undefined);
    return low === victim;
  }
  return true;
}

/** かばって受けた後の反撃・状態異常（攻撃した味方へ。敵からの効果として扱う） */
function guardRetort(ctx: EffectCtx, guard: EnemyState, attacker: Unit) {
  const st = guard.guardStyle;
  if (!st || guard.dead) return;
  if (st.retaliate) {
    const back = dealDamage(makeCtx(ctx.state, ctx.rng, ctx.events, guard, { depth: ctx.depth + 1 }), attacker, st.retaliate, st.element);
    addLog(ctx.state, `${nameOf(guard)}がかばった一撃を返した（${nameOf(attacker)}に${back}）`);
  }
  if (st.status && !attacker.dead) {
    addStatus(attacker.statuses, st.status.status, st.status.amount);
    ctx.events.push({ type: 'status', unitId: unitIdOf(attacker), status: st.status.status, amount: st.status.amount });
    addLog(ctx.state, `${nameOf(guard)}にかばわれた一撃で、${nameOf(attacker)}に「${getStatus(st.status.status).name}」${st.status.amount}`);
  }
}

// ---------- ダメージ（ダメージの効果・特殊能力から使う） ----------

/**
 * victim にダメージを与える。倍率（敵のレベル・特殊能力・状態異常）、ブロック、かばう、戦闘不能まで処理する。
 * HPに入った量を返す
 */
/** cap = 倍率を全部掛けた後のダメージの上限（決め技などの「最大〇〇」。区切りD） */
export function dealDamage(ctx: EffectCtx, victim: Unit, base: number, element?: string, extraMultiplier = 1, cap?: number): number {
  const { state, rng, events, source } = ctx;
  if (victim.dead) return 0;
  // 武器に宿った属性: 属性の無い物理攻撃がその属性になる（妖精の泉）
  element = convertedElement(source, ctx.card, attackElement(source, ctx.card, element));
  // 区切りD: エレメンタル・チェイン — 属性が無ければ、狙った敵の弱点の属性になる（耐性の無い最初の物）
  if (!element && isEnemy(victim) && cardModifier(ctx.cardAbilities, 'weaknessElement').length) element = enemyWeak(victim)[0];
  let v = victim;
  // かばう（魔王軍の騎士）: ほかの敵を狙った「敵1体が対象のカード」のダメージは、かばっている敵が受ける（2体いれば並びの前）。
  // 全体攻撃・お供と召喚の攻撃（via・分身）・道具・能力は、そのまま通る
  // 2026-11-14: かばう形（guardStyle）で、かばう相手・いつまで・受けた時の反撃が敵ごとに変わる
  let guardedBy: EnemyState | undefined;
  if (!isEnemy(source) && isEnemy(v) && ctx.card?.target === 'enemy' && v === ctx.target && !ctx.via && !ctx.echo) {
    const victimEnemy = v;
    const guard = state.enemies.find((e) => !e.dead && e.guarding && e !== victimEnemy && guardCovers(state, e, victimEnemy));
    if (guard) {
      abilityTriggered(state, guard.uid, 'かばう', events);
      addLog(state, `${nameOf(guard)}が${nameOf(v)}をかばった`);
      v = guard;
      guardedBy = guard;
      // 殻で受ける（貝の騎士）: 代わりに受けるダメージは半分
      if (guard.guardStyle?.half) extraMultiplier *= 0.5;
    }
  }
  let mods = damageModifiers(state, source, ctx.card, v, ctx.cardAbilities, ctx.perfect, element, ctx.via);
  // 鎧通し（氷の剣士。2026-11-14）: この一撃はブロックを無視する（ブロックは壊れずに残る）
  if (ctx.pierce) mods = { ...mods, ignoreBlock: true };
  // 属性を強める状態異常（聖光など）: この一撃で使い切る
  const boost = element ? elementBoost(source, element, state.turn) : 1;
  base = Math.round(base * boost);
  // 区切りD: 連携の上乗せの倍率（このカードの力）・弱点看破の印（弱点の属性でなくても ×1.5）
  const comboScale = cardModifier(ctx.cardAbilities, 'comboScale').reduce((m, e) => m * e.multiplier, 1);
  // ラグナロク・ブレード: いつでも弱点を突いた扱い
  const alwaysWeak = !isEnemy(source) && cardModifier(ctx.cardAbilities, 'alwaysWeak').length > 0;
  const exposedMul = (u: Unit) => isEnemy(u) && !isEnemy(source) && (u.exposed || alwaysWeak) && elementMultiplier(u, element) < BALANCE.elementWeakMul ? BALANCE.elementWeakMul : 1;
  let dmg = calcDamage(base + mods.add + (ctx.addOnceUsed ? 0 : mods.addOnce), source.statuses, v.statuses, extraMultiplier * mods.multiplier * elementMultiplier(v, element) * exposedMul(v) * comboMultiplier(source, v, comboScale));
  // かばう: 相手の攻撃でこのままだとHP0になる場合、同じ側の他の仲間が確率で代わりに受ける
  if (isEnemy(source) !== isEnemy(v) && dmg - (mods.ignoreBlock ? 0 : v.block) >= v.hp) {
    for (const other of sideOf(state, v)) {
      if (other === v) continue;
      const cov = coverChance(other);
      if (!cov) continue;
      if (rng.next() * 100 < cov.chance) {
        abilityTriggered(state, unitIdOf(other), cov.name, events, cov.source);
        addLog(state, `${nameOf(other)}の「${cov.name}」！ ${nameOf(v)}をかばった`);
        v = other;
        mods = damageModifiers(state, source, ctx.card, v, ctx.cardAbilities, ctx.perfect, element, ctx.via);
        if (ctx.pierce) mods = { ...mods, ignoreBlock: true };
        dmg = calcDamage(base + mods.add + (ctx.addOnceUsed ? 0 : mods.addOnce), source.statuses, v.statuses, extraMultiplier * mods.multiplier * elementMultiplier(v, element) * exposedMul(v) * comboMultiplier(source, v, comboScale));
        break;
      }
    }
  }
  if (cap !== undefined) dmg = Math.min(dmg, cap);
  // 「最初の1回の攻撃にだけ足すダメージ」は、ここで使い切る（×N回・全体のカードでも1回だけ）
  if (mods.addOnce) ctx.addOnceUsed = true;
  for (const n of mods.active) recordActivation(ctx, n);
  const stage = comboStage(source, v);
  if (stage > 0) recordActivation(ctx, { name: COMBO_NAMES[stage] ?? COMBO_NAME, source: { kind: 'other' } });
  if (stage > 0 && dmg > 0) ctx.comboLanded = true;
  // 弱点の属性で攻撃したか（BREAK のきっかけ。かばう・属性の変換の後の、実際の相手と属性で見る）
  // 区切りD: 弱点看破の印のある敵・導きの光の味方の攻撃も、弱点を突いた扱い（印は1回で消える）
  const exposed = isEnemy(v) && !isEnemy(source) && (!!v.exposed || alwaysWeak) && dmg > 0;
  const guided = !isEnemy(source) && !!source.guided && isEnemy(v) && dmg > 0;
  if (exposed && isEnemy(v)) delete v.exposed;
  const weakHit = (!!element && isEnemy(v) && isWeakTo(v, element)) || exposed || guided;
  if (weakHit && dmg > 0 && !isEnemy(source) && !(ctx.weakHitIds ??= []).includes(unitIdOf(v))) ctx.weakHitIds.push(unitIdOf(v));
  // 連携攻撃の記録（このターンにこの敵を攻撃した味方）
  if (isEnemy(v) && !isEnemy(source)) {
    const id = unitIdOf(source);
    if (!(v.hitBy ??= []).includes(id)) v.hitBy.push(id);
    // 区切りD: 挟撃の陣（2 = ブロック3 / 3 = ブロック4・フォーカス+1。ブロックは殴るたび（元の文どおり）、フォーカスは1人1回）
    if ((v.pincer ?? 0) >= 2 && dmg > 0) {
      const gain = v.pincer! >= 3 ? 4 : 3;
      source.block = Math.min(BALANCE.blockMax, source.block + gain);
      events.push({ type: 'block', unitId: id, amount: gain });
      if (v.pincer! >= 3 && !(v.pincerFocus ??= []).includes(id)) {
        v.pincerFocus.push(id);
        if (!isEnemy(source)) source.focus = Math.min(source.focusMax, source.focus + 1);
      }
    }
  }
  // 区切りD: 不動の拳 — この敵の番に受けた攻撃の量（防いだ分も入れる）を数える
  if (!isEnemy(v) && isEnemy(source) && v.counters?.fudoOn) v.counters.fudoStore = (v.counters.fudoStore ?? 0) + dmg;
  if (mods.ignoreBlock && v.block > 0 && mods.ignoreBlockNotice) recordActivation(ctx, mods.ignoreBlockNotice);
  if (!isEnemy(v) && dmg > 0 && isEnemy(source)) {
    if (v.airborne) return 0;
    const shield = v.summons?.findIndex(s => s.intercept) ?? -1;
    if (shield >= 0) {
      const [s] = v.summons!.splice(shield, 1);
      abilityTriggered(state, v.id, s.name, events, { kind: 'summon', id: s.id, label: s.name });
      events.push({ type: 'damage', unitId: v.id, amount: 0, blocked: dmg, sourceId: unitIdOf(source) });
      // 無明逆流れ: 受け止めた攻撃者に返す
      if (s.counter && !source.dead && ctx.depth < 3) {
        const back = dealDamage(makeCtx(state, rng, events, v, { depth: ctx.depth + 1 }), source, s.counter);
        addLog(state, `${nameOf(v)}の「${s.name}」！ ${nameOf(source)}に${back}ダメージで返した`);
      }
      return 0;
    }
  }
  // 属性の守り（無効・吸収・半減）。敵の攻撃から味方を守る
  const guard = isEnemy(source) !== isEnemy(v) ? elementGuardOf(v, element) : undefined;
  if (guard) {
    const guarded = guard === 'half' ? Math.floor(dmg / 2) : 0;
    if (guard === 'absorb' && dmg > 0) {
      const healed = healUnit(v, dmg, events);
      if (healed > 0) ctx.parts.push(`${healed}吸収`);
    }
    dmg = guarded;
  }
  const r = absorb(dmg, mods.ignoreBlock ? 0 : v.block, v.hp);
  if (!mods.ignoreBlock) v.block = r.block;
  // 区切りD: 命綱 — HPは1より下がらない
  if (r.hp <= 0 && v.hp > 0 && enduresOf(v)) { r.hpLoss -= 1 - r.hp; r.hp = 1; }
  v.hp = r.hp;
  if (r.hpLoss > 0) noteHpLoss(v, r.hpLoss);
  // 区切りF: 転職の条件の記録 — 敵の攻撃をブロックで防いだ量（拳聖）
  if (r.blocked > 0 && isEnemy(source) && !isEnemy(v)) { const f = (v.feats ??= {}); f.blockedTotal = (f.blockedTotal ?? 0) + r.blocked; const cs = (v.counters ??= {}); cs.blockedPhase = (cs.blockedPhase ?? 0) + r.blocked; }
  events.push({ type: 'damage', unitId: unitIdOf(v), amount: r.hpLoss, rawAmount: dmg, blocked: r.blocked, sourceId: unitIdOf(source) });
  if (isEnemy(v)) state.stats.totalDamage += r.hpLoss;
  ctx.dealt += r.hpLoss;
  if (isEnemy(source) !== isEnemy(v) && !ctx.hitIds.includes(unitIdOf(v))) ctx.hitIds.push(unitIdOf(v));
  afterHpLoss(state, v, rng, events);
  // かばった敵の反撃（空の騎士の光・毒液の蟹の毒。2026-11-14）: 代わりに受けた一撃ごとに、攻撃した味方へ
  if (guardedBy && !source.dead && ctx.depth < 3) guardRetort(ctx, guardedBy, source);
  // BREAK: 大技の予告を出している敵に、弱点の属性で攻撃／完全成功で攻撃／このターンの合計ダメージが最大HPの2割以上
  if (isEnemy(v) && !isEnemy(source)) {
    // 区切りD: 鎧通しの一撃 — BREAK の数えを2倍に
    const breakMul = cardModifier(ctx.cardAbilities, 'breakCount').filter((e) => testConditions(e.if, { state, self: source, card: ctx.card, target: v })).reduce((m, e) => m * e.multiplier, 1);
    v.turnDamage = (v.turnDamage ?? 0) + r.hpLoss * breakMul;
    // 区切りD: 魔力の楔 — 成功1でも、完全成功と同じに崩せる
    const earlyBreak = cardModifier(ctx.cardAbilities, 'breakOnSuccess').some((e) => (ctx.successes ?? 0) >= e.min);
    if (dmg > 0 && canBreak(v)) {
      const why = breakReason(state, v, weakHit, !!ctx.perfect && !!ctx.card, earlyBreak && !!ctx.card, { card: ctx.card, focusUsed: ctx.focusUsed, hasWeakCard: ctx.hasWeakCard && (() => ctx.hasWeakCard!(v)) });
      if (why) {
        breakEnemy(ctx, v, why);
        // 段階7a: きっかけ「自分の攻撃で敵を BREAK させた」（処刑人の黒外套）
        if (ctx.depth < 3 && !source.dead) fireAbilities(state, rng, events, source, 'broke', { target: v, depth: ctx.depth + 1 });
      }
    }
  }
  // 属性の状態異常（HPに当たった時。完全成功なら必ず。耐性があれば効かない）
  if (element && r.hpLoss > 0 && !v.dead && !ctx.noStatus) {
    const el = getElement(element);
    // 乱数の順番を変えないように、先に確率を引いてから「防ぐ能力」を見る
    if (el.status && !resistsElement(v, element) && (ctx.perfect || rng.next() * 100 < (el.chance ?? 0)) && !(isEnemy(source) !== isEnemy(v) && guardStatus(state, events, v, el.status))) {
      const n = (el.amount ?? 1) + (isEnemy(source) !== isEnemy(v) ? statusBonusOf(source, el.status, ctx.card, v, state, true) : 0);
      addStatus(v.statuses, el.status, n);
      events.push({ type: 'status', unitId: unitIdOf(v), status: el.status, amount: n });
      ctx.parts.push(`${getStatus(el.status).name}${n}`);
      // きっかけ: 相手に状態異常を与えた
      if (ctx.depth < 3 && isEnemy(source) !== isEnemy(v) && !source.dead) fireAbilities(state, rng, events, source, 'inflict', { target: v, statusId: el.status, dealt: n, depth: ctx.depth + 1 });
      // 段階7b: 味方に悪い状態異常が付いた（悪夢の毛皮）
      if (ctx.depth < 3 && !isEnemy(v) && getStatus(el.status).harmful) fireAbilities(state, rng, events, v, 'statusTaken', { statusId: el.status, dealt: n, attacker: source, depth: ctx.depth + 1 });
    }
  }
  // 転職の条件の記録: 味方が敵を倒した（属性・呪い・自分のHPが少ない時）
  if (v.dead && isEnemy(v) && !isEnemy(source)) {
    const f = (source.feats ??= {});
    const add = (k: string) => (f[k] = (f[k] ?? 0) + 1);
    add('kills');
    if (source.equippedWeaponType) add(`kills:weapon:${source.equippedWeaponType}`);
    if (element) add('kills:element');
    if ((v.statuses.curse ?? 0) > 0) add('kills:cursed');
    if (Object.entries(v.statuses).some(([id, n]) => n > 0 && getStatus(id).harmful)) add('kills:status');
    if (source.hp <= source.maxHp * 0.3) add('kills:lowHp');
    if (getEnemy(v.defId).size !== undefined && getEnemy(v.defId).size! >= 1.3) add('kills:big');
    // 区切りF: 違う種類の悪い状態異常が2つ以上付いた敵を倒した（竜脈術師）
    if (Object.entries(v.statuses).filter(([id, n]) => n > 0 && getStatus(id).harmful).length >= 2) add('kills:multiStatus');
  }
  // きっかけ: ダメージを受けた / 倒した
  if (ctx.depth < 3) {
    if (r.hpLoss > 0 && !v.dead) fireAbilities(state, rng, events, v, 'hurt', { attacker: source, depth: ctx.depth + 1 });
    // きっかけ: 相手の攻撃を、ブロックで完全に防いだ
    // dealt = 防いだ量（段階7c: イージスの鏡盾。ほかの blocked の能力は dealt を使わない）
    if (r.hpLoss === 0 && r.blocked > 0 && !v.dead && isEnemy(source) !== isEnemy(v)) fireAbilities(state, rng, events, v, 'blocked', { attacker: source, dealt: r.blocked, depth: ctx.depth + 1 });
    // 区切りF: 敵の攻撃をブロックで防いだ（一部でも）。dealt = 防いだ量（拳聖《後の先》）
    if (r.blocked > 0 && isEnemy(source) && !isEnemy(v) && !v.dead) fireAbilities(state, rng, events, v, 'guarded', { attacker: source, dealt: r.blocked, depth: ctx.depth + 1 });
    if (v.dead && isEnemy(source) !== isEnemy(v) && !source.dead) fireAbilities(state, rng, events, source, 'kill', { target: v, condCard: ctx.card, depth: ctx.depth + 1 });
    // 不具合の直し（2026-11-12）: カード自身の能力の「敵を倒した時」（天下割り《覇道》・全軍突撃・神罰など）が、今まで一度も働いていなかった。使っているカードの能力も、ここで動かす
    if (v.dead && isEnemy(v) && !isEnemy(source) && !source.dead && ctx.cardAbilities?.length && ctx.depth < 3) fireAbilities(state, rng, events, source, 'kill', { target: v, card: ctx.card, list: ctx.cardAbilities, depth: ctx.depth + 1 });
    if (v.dead && isEnemy(v) && !isEnemy(source)) for (const a of state.allies) if (!a.dead) fireAbilities(state, rng, events, a, 'allyKill', { target: v, depth: ctx.depth + 1 });
  }
  return r.hpLoss;
}
