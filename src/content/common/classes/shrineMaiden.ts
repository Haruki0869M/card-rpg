import type { ClassDef } from '../../../types';
import { bishop } from './bishop';

export const shrineMaiden: ClassDef = {
  ...bishop, id: 'shrineMaiden', order: 306, name: '巫女', role: '神を降ろし仲間を守る',
  tier: 'special', from: ['bishop'], altar: 'shrineMaiden',
  baseMaxHp: bishop.baseMaxHp + 8,
  stats: { ...bishop.stats, per: bishop.stats.per + 6, vit: bishop.stats.vit + 4 },
  weaponType: 'scepter', subWeapons: ['hammer'], startingEquipment: { ...bishop.startingEquipment, weapon: 'woodScepter' },
  battleAbility: { name: '祈りの余韻', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 1, to: 'allies' }] } },
  exploreAbility: { id: 'shrineMaidenExplore', name: '清めの鈴', description: '瘴気の判定+20%', effect: { kind: 'checkBonus', check: 'miasma', bonus: 20 } },
  requires: { feat: 'prayers', count: 3, text: '祠で3回祈る' },
  cardPool: ['maidenHeal', 'maidenPurify', 'maidenWard', 'maidenFocus', 'maidenLight', 'divinePossession'], signature: ['maidenHeal', 'maidenPurify', 'maidenWard'],
  jobCards: ['divinePossession'],
};
