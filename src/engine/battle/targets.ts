import type { AllyState, BattleState, CardDef } from '../../types';
import { unitIdOf, type Unit } from './units';

/** 手動の単体対象。自動能力や全体効果とは分ける。 */
export const needsCardTarget = (card: CardDef) => ['enemy', 'ally', 'otherAlly', 'fallenAlly'].includes(card.target);
export const isAllyCard = (card: CardDef) => ['ally', 'otherAlly', 'fallenAlly'].includes(card.target);
export function cardTargets(state: BattleState, source: AllyState, card: CardDef): Unit[] {
  if (card.target === 'enemy') return state.enemies.filter(e => !e.dead);
  if (!isAllyCard(card)) return [];
  return state.allies.filter(a => (card.target === 'fallenAlly' ? a.dead : !a.dead) && (card.target !== 'otherAlly' || a.id !== source.id));
}
export const selectedCardTarget = (state: BattleState, source: AllyState, card: CardDef, id?: string) => cardTargets(state, source, card).find(u => unitIdOf(u) === id);
export const targetGuide = (card: CardDef) => card.target === 'enemy' ? '対象の敵をタップしてください' : card.target === 'fallenAlly' ? '戦闘不能の味方を選んでください' : card.target === 'otherAlly' ? '自分以外の味方を選んでください' : '回復・支援する味方を選んでください';

export const secondaryCard = (card: CardDef): CardDef => ({ ...card, target: card.secondaryTarget ?? 'self', secondaryTarget: undefined });
export const secondaryCardTarget = (state: BattleState, source: AllyState, card: CardDef, id?: string) => card.secondaryTarget ? selectedCardTarget(state, source, secondaryCard(card), id) : undefined;
