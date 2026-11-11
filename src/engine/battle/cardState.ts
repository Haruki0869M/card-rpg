import type { AllyState, CardDef, CardTier } from '../../types';
import { isEnemy, type Unit } from './units';

export function attackElement(source: Unit, card?: CardDef, element?: string): string | undefined {
  return element ?? (!isEnemy(source) && card?.category === 'physical' ? source.imbuedElement ?? source.weaponElement : undefined);
}

/** カードが持つ属性（どの段のダメージ効果でも。属性の無いカードは空） */
export const cardElements = (card?: CardDef): string[] => [...new Set((card?.tiers ?? []).flatMap((t) => t.effects.flatMap((e) => (e.kind === 'damage' && e.element ? [e.element] : []))))];

export function chargedMultiplier(source: Unit, card?: CardDef): number {
  if (isEnemy(source) || !card || card.category !== source.attackCharge?.category) return 1;
  return source.attackCharge.multiplier;
}

export const tierHpCost = (tier: CardTier) => tier.effects.reduce((n, e) => n + (e.kind === 'payHp' ? e.amount : 0), 0);
export const cardHpCost = (card: CardDef) => Math.max(0, ...card.tiers.map(tierHpCost));
export function afterAttackCard(ally: AllyState, card: CardDef, tier: CardTier) {
  if (!tier.effects.some(e => e.kind === 'damage')) return;
  if (ally.attackCharge?.category === card.category) delete ally.attackCharge;
  if (card.category === 'physical') delete ally.imbuedElement;
}
