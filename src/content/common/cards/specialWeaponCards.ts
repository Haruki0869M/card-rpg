import type { CardDef } from '../../../types';
export const specialWeaponCards: CardDef[] = [
  { id: 'wGunShot', name: '単発射撃', category: 'physical', cost: 1, slots: 1, baseChance: 85, stat: 'dex', target: 'enemy', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 4 }] }, { minSuccesses: 1, effects: [{ kind: 'damage', amount: 8 }] }] },
  { id: 'wEncouragingNote', name: '励ましの音色', category: 'skill', cost: 1, slots: 1, baseChance: 80, stat: 'luk', target: 'self', tiers: [{ minSuccesses: 0, effects: [{ kind: 'block', amount: 2, to: 'allies' }] }, { minSuccesses: 1, effects: [{ kind: 'block', amount: 3, to: 'allies' }] }] },
];
