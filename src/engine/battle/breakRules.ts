// ===== BREAK の決まりの測定用のつまみ（2026-11-13・測るだけ）: 「この味方は、この敵の弱点を突けるカードを持っているか」 =====
// BALANCE.breakPerfectNoWeakCard（既定 false = 使わない）の時だけ、エンジンと bot が読む。既定の値では、どこからも呼ばれない。
// 決め方（画面で説明できる形。乱数は使わない）:
//   その味方の 手札・山札・捨て札 のカード（武器の札も、戦闘の山札に入っているので含む）の中に、
//   「その敵の弱点（一時的な弱点＝油壺も含む）の属性で当たる攻撃」か「弱点を突いた扱いになる攻撃（ラグナロク・ブレードなど）」が1枚でもあるか。
//   属性は、ダメージを与える時と同じ順で決める: カードの属性 → 物理なら、宿した属性・武器に宿った属性 → 装備の属性の変換 → 属性変幻（敵の弱点）。
//   耐性のある属性は数えない。消耗品・仲間の力（弱点看破の印など）は数えない（その人のカードだけを見る）。
import { cardModifier, cardTraitAbilities, convertedElement } from '../abilities';
import { cardOf } from '../../data/cards';
import { getEnemy } from '../../data/enemies';
import type { AllyState, CardDef, EnemyState } from '../../types';
import { attackElement } from './cardState';

/** そのカードが、その敵の弱点を突ける攻撃か（ダメージの効果のどれか1つでも） */
export function cardHitsWeakness(ally: AllyState, card: CardDef, enemy: EnemyState): boolean {
  const def = getEnemy(enemy.defId);
  const abilities = cardTraitAbilities(card);
  let any = false;
  for (const t of card.tiers) for (const e of t.effects) {
    if (e.kind !== 'damage') continue;
    any = true;
    let el = convertedElement(ally, card, attackElement(ally, card, e.element));
    if (!el && cardModifier(abilities, 'weaknessElement').length) el = def.weak?.find((w) => !def.resist?.includes(w));
    if (el && !def.resist?.includes(el) && (def.weak?.includes(el) || enemy.tempWeak === el)) return true;
  }
  return any && cardModifier(abilities, 'alwaysWeak').length > 0;
}

/** その味方の手札・山札・捨て札に、その敵の弱点を突けるカードが1枚でもあるか */
export function allyHasWeakCard(ally: AllyState, enemy: EnemyState): boolean {
  for (const c of [...ally.hand, ...ally.drawPile, ...ally.discard]) if (cardHitsWeakness(ally, cardOf(c), enemy)) return true;
  return false;
}
