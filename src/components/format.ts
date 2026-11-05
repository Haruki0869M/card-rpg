import { getEnemyAction } from '../data/enemies';
import { enemyHitDamage, findAlly } from '../engine';
import type { BattleState, CardDef, CardEffect, EnemyState, StatusId } from '../types';

export const CATEGORY_LABEL = { physical: '物理', magic: '魔法', skill: 'スキル' } as const;
export const STATUS_LABEL = { vulnerable: '脆弱', weak: '弱体', burn: '火傷', poison: '毒' } as const;

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

/** 詳細表示用の全文 */
export function longEffect(e: CardEffect): string {
  switch (e.kind) {
    case 'damage':
      return `${e.amount}ダメージ`;
    case 'block':
      return `ブロック${e.amount}獲得`;
    case 'applyStatus':
      return `敵に「${STATUS_LABEL[e.status]}」${e.amount}付与`;
    case 'gainMana':
      return `マナ${e.amount}回復`;
    case 'gainFocus':
      return `フォーカス${e.amount}回復`;
    case 'draw':
      return `カードを${e.amount}枚引く`;
    case 'tauntTarget':
      return '対象の敵の単体攻撃を自分に向ける';
    case 'tauntAll':
      return '敵全体の単体攻撃を自分に向ける';
    case 'blockAllies':
      return `味方全員にブロック${e.amount}`;
    case 'healAllies':
      return `味方全員のHPを${e.amount}回復`;
  }
}

export type IntentPart =
  | { kind: 'attack'; damage: number; hits: number; targetId?: string }
  | { kind: 'attackAll'; damage: number; hits: number }
  | { kind: 'block'; amount: number; others: boolean }
  | { kind: 'debuff'; status: StatusId; amount: number; targetId?: string; all: boolean };

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
    if (eff.kind === 'attack') {
      if (eff.target === 'single') {
        const dmg = enemyHitDamage(enemy, eff.amount, target);
        parts.push({ kind: 'attack', damage: dmg, hits: eff.hits, targetId: target?.id });
        details.push(`${targetName}に${dmg}ダメージ${eff.hits > 1 ? `×${eff.hits}回` : ''}`);
      } else {
        const dmg = enemyHitDamage(enemy, eff.amount, undefined);
        parts.push({ kind: 'attackAll', damage: dmg, hits: eff.hits });
        details.push(`味方全員に${dmg}ダメージ${eff.hits > 1 ? `×${eff.hits}回` : ''}（脆弱の味方には×1.5）`);
      }
    } else if (eff.kind === 'block') {
      parts.push({ kind: 'block', amount: eff.amount, others: eff.target !== 'self' });
      details.push(eff.target === 'self' ? `自分にブロック${eff.amount}` : `自分以外の敵全員にブロック${eff.amount}`);
    } else if (eff.kind === 'debuff') {
      const all = eff.target === 'all';
      parts.push({ kind: 'debuff', status: eff.status, amount: eff.amount, targetId: all ? undefined : target?.id, all });
      details.push(`${all ? '味方全員' : targetName}に「${STATUS_LABEL[eff.status]}」${eff.amount}`);
    }
  }
  if (action.effects.some((e) => e.kind === 'attack')) {
    if (enemy.attackMul !== 1) details.push(`（Lv${enemy.level}の攻撃力補正 ×${enemy.attackMul.toFixed(2)} 反映済み）`);
    if (enemy.statuses.weak > 0) details.push('（弱体によりダメージ×0.75 反映済み）');
  }
  return { parts, name: action.name, details };
}
