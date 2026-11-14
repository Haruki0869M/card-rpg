import type { ClassDef } from '../../../types';

// 中位ジョブ: 僧侶 → 司祭 → 教皇（設計 v2 §3）
export const bishop: ClassDef = {
  id: 'bishop',
  order: 109,
  name: '司祭',
  role: '祈りをためて仲間を救う',
  icon: '✚',
  color: '#ffe08a',
  baseMaxHp: 58,
  stats: { str: 40, vit: 62, int: 62, per: 82, dex: 54, agi: 42, luk: 54 },
  // 中位ジョブは転職でなるので、最初の山札は持たない
  deck: [],
  battleAbility: {
    name: '祈りの器',
    description: '回復のカードを3回使うたびに、味方全員のHPを6回復',
    effect: { when: 'afterCard', if: [{ kind: 'cardHasHeal' }, { kind: 'everyN', n: 3, key: 'prayerVessel' }], do: [{ kind: 'heal', amount: 6, to: 'allies' }] },
  },
  exploreAbility: { id: 'sanctuary', name: '聖域', description: '休憩・野営の回復+80%', effect: { kind: 'restBonus', multiplier: 1.8 } },
  names: { male: ['ベネディクト', 'アンセル', 'テオ', 'ルカ'], female: ['マリア', 'セラフィナ', 'アグネス', 'エマ'] },
  unlocked: true,
  hpPerLevel: 5,
  weaponType: 'scepter',
  subWeapons: ['hammer'],
  tier: 'mid',
  lineage: 'sei',
  from: ['priest'],
  signature: ['greaterHeal', 'sanctify', 'massHeal'],
  startingEquipment: { weapon: 'woodScepter', armor: 'travelerClothes' },
  cardPool: ['greaterHeal', 'sanctify', 'massHeal', 'purify', 'wardOfFaith', 'resurgence', 'axOverflowBlessing', 'axSeraphim', 'axReversalSeal'],
  growthWeights: { per: 4, vit: 2, int: 1 },
};
