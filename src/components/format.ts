import { CATEGORY_LABEL } from '../data/terms';
import { getStatus } from '../data/statuses';
import { activeStatuses, actionFailChanceOf, skipActionStatus } from '../engine';
import { getElement } from '../data/elements';
import { getEnemyAction } from '../data/enemies';
import { describeEffect, enemyHitDamage, findAlly, targetOf } from '../engine';
import type { BattleState, CardDef, CardEffect, EnemyState, StatusId } from '../types';

export { CATEGORY_LABEL };
/** 状態異常の名前 */
export const STATUS_LABEL = (id: string) => getStatus(id).name;

/** Tierがカバーする成功数の範囲表記（例: "0-1", "2"） */
export function tierRange(card: CardDef, i: number): string {
  const lo = card.tiers[i].minSuccesses;
  const hi = i + 1 < card.tiers.length ? card.tiers[i + 1].minSuccesses - 1 : card.slots;
  return lo === hi ? `${lo}` : `${lo}-${hi}`;
}

export function tierTitle(card: CardDef, i: number): string {
  const lo = card.tiers[i].minSuccesses;
  if (lo === card.slots) return `${lo}成功（完全成功）`;
  return `${tierRange(card, i).replace('-', '〜')}成功`;
}

/** 詳細表示用の全文（効果の部品の説明文。全体カードなら「敵全員に」） */
export const longEffect = (e: CardEffect, card?: CardDef): string => describeEffect(e, 'ally', card);

export type IntentPart =
  | { kind: 'attack'; damage: number; hits: number; targetId?: string; element?: string }
  | { kind: 'attackAll'; damage: number; hits: number; element?: string }
  | { kind: 'block'; amount: number; others: boolean }
  | { kind: 'debuff'; status: StatusId; amount: number; targetId?: string; all: boolean }
  /** その他の効果（効果の種類のアイコン＋短い数値） */
  | { kind: 'other'; effect: CardEffect };

export interface IntentView {
  parts: IntentPart[];
  name: string;
  details: string[];
}

/** インテントの表示（敵のレベル・弱体・味方の脆弱を反映した実際の値） */
export function intentView(state: BattleState, enemy: EnemyState): IntentView | null {
  if (!enemy.intent || enemy.dead) return null;
  const action = getEnemyAction(enemy.defId, enemy.intent.actionId);
  const target = enemy.intent.targetId ? findAlly(state, enemy.intent.targetId) : undefined;
  const targetName = target ? target.name : '（対象なし）';
  const parts: IntentPart[] = [];
  const details: string[] = [];
  for (const eff of action.effects) {
    const to = targetOf(eff);
    if (eff.kind === 'damage') {
      const hits = eff.hits ?? 1;
      if (to === 'target') {
        const dmg = enemyHitDamage(enemy, eff.amount, target);
        parts.push({ kind: 'attack', damage: dmg, hits, targetId: target?.id, element: eff.element });
        details.push(`${targetName}に${dmg}の${elementText(eff.element)}ダメージ${hits > 1 ? `×${hits}回` : ''}${elementStatusText(eff.element)}`);
      } else {
        const dmg = enemyHitDamage(enemy, eff.amount, undefined);
        parts.push({ kind: 'attackAll', damage: dmg, hits, element: eff.element });
        details.push(`味方全員に${dmg}の${elementText(eff.element)}ダメージ${hits > 1 ? `×${hits}回` : ''}${elementStatusText(eff.element)}（状態異常で増減あり）`);
      }
    } else if (eff.kind === 'block' && (to === 'self' || to === 'otherAllies' || to === 'allies')) {
      parts.push({ kind: 'block', amount: eff.amount, others: to !== 'self' });
      details.push(describeEffect(eff, 'enemy'));
    } else if (eff.kind === 'applyStatus' && (to === 'target' || to === 'foes')) {
      const all = to === 'foes';
      parts.push({ kind: 'debuff', status: eff.status, amount: eff.amount, targetId: all ? undefined : target?.id, all });
      details.push(`${all ? '味方全員' : targetName}に「${STATUS_LABEL(eff.status)}」${eff.amount}`);
    } else {
      parts.push({ kind: 'other', effect: eff });
      details.push(describeEffect(eff, 'enemy').replace('対象に', `${targetName}に`));
    }
  }
  // 凍結・痺れ（行動を休む・失敗する）
  const frozen = skipActionStatus(enemy.statuses);
  if (frozen) details.unshift(`${frozen.name}で、この行動は休む`);
  else {
    const fail = actionFailChanceOf(enemy.statuses);
    if (fail) details.unshift(`痺れなどで${fail}%の確率で行動に失敗する`);
  }
  if (action.effects.some((e) => e.kind === 'damage')) {
    if (enemy.attackMul !== 1) details.push(`（Lv${enemy.level}の攻撃力補正 ×${enemy.attackMul.toFixed(2)} 反映済み）`);
    for (const { def } of activeStatuses(enemy.statuses))
      if (def.dealtMultiplier !== undefined) details.push(`（${def.name}によりダメージ×${def.dealtMultiplier} 反映済み）`);
  }
  return { parts, name: action.name, details };
}

/** 属性の名前（無属性なら空） */
const elementText = (id?: string) => (id ? `${getElement(id).name}属性の` : '').replace(/の$/, '');

/** 属性の状態異常の確率の表示 */
function elementStatusText(id?: string): string {
  const el = id ? getElement(id) : undefined;
  return el?.status ? `（${el.chance}%で${getStatus(el.status).name}${el.amount ?? 1}）` : '';
}
