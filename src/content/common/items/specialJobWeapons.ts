import type { ItemDef } from '../../../types';
export const specialJobWeapons: ItemDef[] = [
  { id: 'antiqueGun', name: '古式銃', slot: 'weapon', weaponType: 'gun', rarity: 'common', icon: 'gun', description: '狙いを定めて撃つ、使い込まれた銃。', cards: [{ cardId: 'strike', count: 2 }] },
  { id: 'travelerLute', name: '旅人のリュート', slot: 'weapon', weaponType: 'instrument', rarity: 'common', icon: 'instrument', description: '仲間を励ます、旅人の小さな楽器。', cards: [{ cardId: 'wEncouragingNote', count: 2 }] },
];
