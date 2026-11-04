import { getClass } from '../data/classes';
import { getEnemyAction } from '../data/enemies';
import { calcDamage, findAlly } from '../engine';
import type { BattleState, CardDef, CardEffect, CardTier, EnemyState } from '../types';

export const CATEGORY_LABEL = { physical: '物理', magic: '魔法', skill: 'スキル' } as const;
export const CATEGORY_ICON = { physical: '⚔️', magic: '✨', skill: '💠' } as const;

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

/** カード上の短縮表記 */
export function shortEffect(e: CardEffect): string {
  switch (e.kind) {
    case 'damage':
      return `⚔${e.amount}`;
    case 'block':
      return `🛡${e.amount}`;
    case 'applyStatus':
      return e.status === 'vulnerable' ? `脆${e.amount}` : `弱${e.amount}`;
    case 'gainMana':
      return `💧+${e.amount}`;
    case 'gainFocus':
      return `🌟+${e.amount}`;
    case 'draw':
      return `🂠+${e.amount}`;
    case 'tauntTarget':
      return '挑発';
    case 'tauntAll':
      return '全挑発';
  }
}

export function shortTier(t: CardTier): string {
  return t.effects.map(shortEffect).join(' ');
}

/** 詳細表示用の全文 */
export function longEffect(e: CardEffect): string {
  switch (e.kind) {
    case 'damage':
      return `${e.amount}ダメージ`;
    case 'block':
      return `ブロック${e.amount}獲得`;
    case 'applyStatus':
      return `敵に「${e.status === 'vulnerable' ? '脆弱' : '弱体'}」${e.amount}付与`;
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
  }
}

export const STATUS_INFO = {
  vulnerable: { icon: '💔', name: '脆弱', text: '受けるダメージ×1.5（端数切り捨て）' },
  weak: { icon: '🥀', name: '弱体', text: '与えるダメージ×0.75（端数切り捨て）' },
  taunt: { icon: '😤', name: '挑発', text: 'このユニットの単体攻撃の対象が、挑発した味方に固定される（次の敵フェーズ終了まで）' },
} as const;

export interface IntentView {
  /** 短縮表記の部品 */
  parts: { icon: string; target?: string; text: string; danger?: boolean }[];
  name: string;
  details: string[];
}

/** インテントの表示（敵の弱体・味方の脆弱を反映した実際の値） */
export function intentView(state: BattleState, enemy: EnemyState): IntentView | null {
  if (!enemy.intent || enemy.dead) return null;
  const action = getEnemyAction(enemy.defId, enemy.intent.actionId);
  const target = enemy.intent.targetId ? findAlly(state, enemy.intent.targetId) : undefined;
  const targetIcon = target ? getClass(target.classId).icon : '？';
  const targetName = target ? target.name : '（対象なし）';
  const parts: IntentView['parts'] = [];
  const details: string[] = [];
  for (const eff of action.effects) {
    if (eff.kind === 'attack') {
      if (eff.target === 'single') {
        const dmg = calcDamage(eff.amount, enemy.statuses, target?.statuses);
        const txt = eff.hits > 1 ? `${dmg}×${eff.hits}` : `${dmg}`;
        parts.push({ icon: '⚔️', target: targetIcon, text: txt, danger: true });
        details.push(`${targetName}に${dmg}ダメージ${eff.hits > 1 ? `×${eff.hits}回` : ''}`);
      } else {
        const dmg = calcDamage(eff.amount, enemy.statuses, undefined);
        parts.push({ icon: '💀', target: '全', text: `${dmg}`, danger: true });
        details.push(`味方全員に${dmg}ダメージ${eff.hits > 1 ? `×${eff.hits}回` : ''}（脆弱の味方には×1.5）`);
      }
    } else if (eff.kind === 'block') {
      parts.push({ icon: '🛡️', target: eff.target === 'self' ? undefined : '他', text: `${eff.amount}` });
      details.push(eff.target === 'self' ? `自分にブロック${eff.amount}` : `自分以外の敵全員にブロック${eff.amount}`);
    } else if (eff.kind === 'debuff') {
      const n = eff.status === 'weak' ? '弱' : '脆';
      parts.push({ icon: '☠️', target: targetIcon, text: `${n}${eff.amount}` });
      details.push(`${targetName}に「${eff.status === 'weak' ? '弱体' : '脆弱'}」${eff.amount}`);
    }
  }
  if (enemy.statuses.weak > 0 && action.effects.some((e) => e.kind === 'attack')) details.push('（弱体によりダメージ×0.75 反映済み）');
  return { parts, name: action.name, details };
}
