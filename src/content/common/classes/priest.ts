import type { ClassDef } from '../../../types';

// 僧侶 → 司祭 → 教皇（spec §6.4）。毎ターン、一番弱っている仲間を癒す
export const priest: ClassDef = {
  id: 'priest',
  order: 7,
  name: '僧侶',
  role: '仲間を癒す',
  icon: '✚',
  color: '#ffe08a',
  baseMaxHp: 50,
  stats: { str: 40, vit: 55, int: 55, per: 70, dex: 50, agi: 40, luk: 50 },
  deck: [
    { cardId: 'smite', count: 3 },
    { cardId: 'guard', count: 3 },
    { cardId: 'mend', count: 2 },
    { cardId: 'blessing', count: 1 },
    { cardId: 'strike', count: 1 },
  ],
  battleAbility: {
    name: '癒しの祈り',
    effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 3, to: 'lowestAlly' }] },
  },
  exploreAbility: { id: 'blessedRest', name: '祝福', description: '休憩・野営の回復+50%', effect: { kind: 'restBonus', multiplier: 1.5 } },
  names: { male: ['ルカ', 'ヨハン', 'セオ', 'アベル'], female: ['マリア', 'セシル', 'クララ', 'ソフィア'] },
  unlocked: true,
  hpPerLevel: 5,
  weaponType: 'scepter',
  subWeapons: ['hammer'],
  tier: 'base',
  lineage: 'sei',
  startingEquipment: { weapon: 'woodScepter', armor: 'travelerClothes' },
  cardPool: ['mend', 'smite', 'blessing', 'prayerOfLight', 'guard', 'sacredHymn', 'judgmentLight', 'shieldOfFaith', 'renew', 'axOverflowBlessing'],
  growthWeights: { per: 3, vit: 2, int: 1 },
};
