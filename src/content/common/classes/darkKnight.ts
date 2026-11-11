import type { ClassDef } from '../../../types';
import { BALANCE } from '../../../data/balance';
import { paladin } from './paladin';

// 特殊職: 中位の転職できるLv（BALANCE.jobChange.special）と実績を満たし、神殿か対応する祭壇で転職する。
export const darkKnight: ClassDef = {
  ...paladin, id: 'darkKnight', order: 305, name: '暗黒騎士', role: '命を削り闇の力で斬る',
  tier: 'special', from: ['paladin'], altar: 'darkKnight',
  baseMaxHp: paladin.baseMaxHp + 8,
  stats: { ...paladin.stats, str: paladin.stats.str + 6, vit: paladin.stats.vit + 4 },
  weaponType: 'sword', subWeapons: ['hammer'],
  startingEquipment: { ...paladin.startingEquipment, weapon: 'copperSword' },
  battleAbility: { name: '暗黒の誓い', effect: { modifier: 'damageDealt', multiplier: 1, scale: { by: 'missingHp', per: BALANCE.specialJobs.missingHpPer, max: BALANCE.specialJobs.missingHpMax } } },
  exploreAbility: { id: 'darkKnightExplore', name: '闇への耐性', description: '瘴気の判定+20%', effect: { kind: 'checkBonus', check: 'miasma', bonus: 20 } },
  requires: { feat: 'kills:lowHp', count: 3, text: '自分のHPが30%以下の時に敵を3体倒す' },
  cardPool: ['bloodBlade', 'bloodShield', 'bloodDrain', 'bloodOffering', 'bloodSweep', 'bloodAbyss', 'axCurseReturn', 'axAdversity', 'axBloodPrice', 'axLifeline'], signature: ['bloodBlade', 'bloodShield', 'bloodDrain'],
};
