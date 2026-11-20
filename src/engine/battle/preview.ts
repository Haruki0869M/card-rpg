import type { AllyState } from '../../types';
import { abilitiesOf, testConditions } from '../abilities';
export function slotPreviewLimitOf(ally: AllyState): number {
  return Math.max(0, ...abilitiesOf(ally).map(a => 'modifier' in a.effect && a.effect.modifier === 'slotPreview' && testConditions(a.effect.if, { self: ally }) ? a.effect.uses : 0));
}
