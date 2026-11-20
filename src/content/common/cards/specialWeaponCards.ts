import type { CardDef } from '../../../types';
export const specialWeaponCards: CardDef[] = [
  { id: 'wEncouragingNote', name: '励ましの音色', category: 'skill', cost: 1, slots: 1, baseChance: 80, stat: 'luk', target: 'self', tiers: [{ minSuccesses: 0, effects: [{ kind: 'block', amount: 2, to: 'allies' }] }, { minSuccesses: 1, effects: [{ kind: 'block', amount: 3, to: 'allies' }] }] },
];
