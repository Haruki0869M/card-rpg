// ===== 弱点の案内（計画書 第2版 §5-1。表示だけ: エンジンの結果・乱数・保存には触れない） =====
// 「狙う敵」の札の短い形（弱点×1.5 / ▼耐性）と、札の下の1行（弱点×1.5！（完全成功で火傷確定））を作る。
// 文の元は全部データ: 倍率 = BALANCE.elementWeakMul、属性ごとの状態異常 = 属性のデータ、一言 = 状態異常のデータの guideNote。
import { BALANCE } from '../../data/balance';
import { getElement } from '../../data/elements';
import { enemyWeak, isResistTo, isWeakTo } from '../../engine/battle/phases';
import { getStatus } from '../../data/statuses';
import { cardModifier, cardTraitAbilities, convertedElement } from '../../engine/abilities';
import { attackElement } from '../../engine/battle/cardState';
import type { AllyState, BattleState, CardDef, EnemyState } from '../../types';

export interface ElementGuide {
  kind: 'weak' | 'resist';
  /** 実際に当たる属性（「弱点を突いた扱い」で属性が無い時は undefined） */
  element?: string;
  /** 札の中の短い形（弱点×1.5 / ▼耐性） */
  chip: string;
  /** 札の下の1行（選んでいる敵だけ。弱点の時だけ） */
  line?: string;
}

/**
 * そのカードが、その敵に実際に当てる属性（エンジンの dealDamage と同じ順で決める）。
 * 武器に宿った属性・《魔法剣》で宿した属性（attackElement）→ 属性の変換（convertedElement）→ 属性変幻（狙った敵の弱点の属性）
 */
export function hitElement(ally: AllyState, card: CardDef, enemy: EnemyState): string | undefined {
  const abilities = cardTraitAbilities(card);
  for (let i = card.tiers.length - 1; i >= 0; i--) {
    for (const eff of card.tiers[i].effects) {
      if (eff.kind !== 'damage') continue;
      let element = convertedElement(ally, card, attackElement(ally, card, eff.element));
      if (!element && cardModifier(abilities, 'weaknessElement').length) element = enemyWeak(enemy)[0];
      return element;
    }
  }
  return undefined;
}

/** カードにダメージの効果があるか */
const hasDamage = (card: CardDef) => card.tiers.some((t) => t.effects.some((e) => e.kind === 'damage'));

/**
 * 弱点・耐性の案内。どちらでもなければ undefined。
 * - 弱点: 敵の弱点の属性・一時的な弱点（tempWeak）・「弱点を突いた扱い」（弱点看破の印・ラグナロク）
 * - 耐性: 敵の耐性の属性（弱点を突いた扱いでも、耐性が先。エンジンの倍率と同じ）
 * - perfectStatuses = 完全成功の時の予測で、その敵に必ず付く状態異常（predictCardTotals の statuses）。
 *   この中に、当たる属性の状態異常がある時だけ「完全成功で〇〇確定」を出す（耐性・ブロックで防がれる・倒してしまう時は出ない）
 * - guarded = ほかの敵にかばわれていて、この敵には当たらない（案内を出さない）。吹雪に隠れている敵への単体のカードも同じ（区切り3b）
 */
export function elementGuide(battle: BattleState, ally: AllyState | undefined, card: CardDef | undefined, enemy: EnemyState, perfectStatuses?: string[]): ElementGuide | undefined {
  if (!ally || !card || !hasDamage(card) || enemy.dead) return undefined;
  if (card.target === 'enemy' && battle.enemies.some((e) => !e.dead && e.guarding && e !== enemy)) return undefined;
  // 区切り3b: 吹雪に隠れている敵には、単体のカードのダメージは外れる（弱点の倍率の案内は出さない。BREAK の案内は FocusPanel が出す）
  if (card.target === 'enemy' && enemy.hidden) return undefined;
  const element = hitElement(ally, card, enemy);
  if (element && isResistTo(enemy, element)) return { kind: 'resist', element, chip: '▼耐性' };
  const alwaysWeak = cardModifier(cardTraitAbilities(card), 'alwaysWeak').length > 0;
  const weak = (!!element && isWeakTo(enemy, element)) || !!enemy.exposed || alwaysWeak;
  if (!weak) return undefined;
  const mul = `弱点×${BALANCE.elementWeakMul}`;
  const top = card.tiers[card.tiers.length - 1];
  const status = element ? getElement(element).status : undefined;
  const sure = !!status && !!top && top.minSuccesses === card.slots && !!perfectStatuses?.includes(status);
  const note = sure ? (getStatus(status!).guideNote ? `${getStatus(status!).name}＝${getStatus(status!).guideNote}` : `${getStatus(status!).name}確定`) : undefined;
  return { kind: 'weak', element, chip: mul, line: `${mul}！${note ? `（完全成功で${note}）` : ''}` };
}
