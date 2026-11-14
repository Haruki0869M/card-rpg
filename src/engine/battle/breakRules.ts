// ===== BREAK の決まりの測定用のつまみ（2026-11-13・測るだけ）: 「この味方は、この敵の弱点を突けるカードを持っているか」 =====
// BALANCE.breakPerfectNoWeakCard（既定 false = 使わない）の時だけ、エンジンと bot が読む。既定の値では、どこからも呼ばれない。
// 決め方（画面で説明できる形。乱数は使わない）:
//   その味方の 手札・山札・捨て札 のカード（武器の札も、戦闘の山札に入っているので含む）の中に、
//   「その敵の弱点（一時的な弱点＝油壺も含む）の属性で当たる攻撃」か「弱点を突いた扱いになる攻撃（ラグナロク・ブレードなど）」が1枚でもあるか。
//   属性は、ダメージを与える時と同じ順で決める: カードの属性 → 物理なら、宿した属性・武器に宿った属性 → 装備の属性の変換 → 属性変幻（敵の弱点）。
//   耐性のある属性は数えない。消耗品・仲間の力（弱点看破の印など）は数えない（その人のカードだけを見る）。
import { cardModifier, cardTraitAbilities, convertedElement } from '../abilities';
import { cardOf } from '../../data/cards';
import { enemyWeak, isResistTo, isWeakTo } from './phases';
import type { AllyState, CardDef, EnemyState } from '../../types';
import { attackElement } from './cardState';
import { behaviorNeedsWeakPerfect, breakDamagePctOf, needsWeakPerfect, perfectAloneBreaks, type BreakRankState } from './effects';

/**
 * 2026-11-13（docs/tasks/break-read-plan.md）: その敵の大技（紫の札を含む）の予告を「どうすれば崩せるか」の決まり（画面の説明が読む。エンジンの決まりの関数から作るので、ずれない）。
 * - weak = その敵の弱点の属性（一時的な弱点＝油壺も含む）
 * - weakAndPerfect = 弱点の属性で、しかも完全成功の時だけ崩れる（ボス・中ボス・災厄で弱点を持つ敵と、紫の札を予告している弱点を持つ敵）
 * - perfectAlone = 完全成功だけで崩れる（弱点を持たない大物・強敵・ふつうの敵）
 * - weakAlone = 弱点の属性なら、完全成功でなくても崩れる（強敵・ふつうの敵）
 * - damagePct = 合計ダメージで崩れる線（%。合計ダメージでは崩れない時は undefined）
 * カードの能力で崩す物（魔力の楔・閃光の破砕玉・崩しの効果）は、どの決まりでも崩せる（ここには入れない）
 */
export interface BreakRule {
  weak: string[]; weakAndPerfect: boolean; perfectAlone: boolean; weakAlone: boolean; damagePct?: number;
  /** 2026-11-13: 決まりが厳しくなった理由（behavior = 紫の札（特殊な行動）の予告 / rank = ボス・中ボス・災厄の戦闘）。厳しくない時は無い */
  strictBy?: 'behavior' | 'rank';
}
export function breakRuleOf(state: BreakRankState, enemy: EnemyState): BreakRule {
  const weak = [...new Set([...enemyWeak(enemy), ...(enemy.tempWeak ? [enemy.tempWeak] : [])])];
  // 2026-11-13（docs/tasks/break-read-plan.md §2）: 紫の札（特殊な行動）の予告も「弱点で完全成功」。エンジンと同じ関数に敵を渡して読む
  const strict = needsWeakPerfect(state, enemy);
  const perfectAlone = perfectAloneBreaks(state, enemy);
  const pct = breakDamagePctOf(state, enemy);
  return {
    weak,
    weakAndPerfect: strict && weak.length > 0 && !perfectAlone,
    perfectAlone,
    weakAlone: !strict && weak.length > 0,
    ...(Number.isFinite(pct) ? { damagePct: pct } : {}),
    ...(strict ? { strictBy: behaviorNeedsWeakPerfect(enemy) ? 'behavior' as const : 'rank' as const } : {}),
  };
}

/** そのカードが、その敵の弱点を突ける攻撃か（ダメージの効果のどれか1つでも） */
export function cardHitsWeakness(ally: AllyState, card: CardDef, enemy: EnemyState): boolean {
  const abilities = cardTraitAbilities(card);
  let any = false;
  for (const t of card.tiers) for (const e of t.effects) {
    if (e.kind !== 'damage') continue;
    any = true;
    let el = convertedElement(ally, card, attackElement(ally, card, e.element));
    if (!el && cardModifier(abilities, 'weaknessElement').length) el = enemyWeak(enemy)[0];
    if (el && !isResistTo(enemy, el) && isWeakTo(enemy, el)) return true;
  }
  return any && cardModifier(abilities, 'alwaysWeak').length > 0;
}

/** その味方の手札・山札・捨て札に、その敵の弱点を突けるカードが1枚でもあるか */
export function allyHasWeakCard(ally: AllyState, enemy: EnemyState): boolean {
  for (const c of [...ally.hand, ...ally.drawPile, ...ally.discard]) if (cardHitsWeakness(ally, cardOf(c), enemy)) return true;
  return false;
}
