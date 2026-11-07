// 武器の種類。職業の weaponType と装備の weaponType で使う。ここに足すと新しい種類（槍・斧など）を使える
import type { WeaponTypeDef } from '../../../types';

export const weaponTypes: WeaponTypeDef[] = [
  { id: 'sword', order: 1, name: '剣', icon: 'sword' },
  { id: 'staff', order: 2, name: '杖', icon: 'staff' },
  { id: 'hammer', order: 3, name: '槌', icon: 'hammer' },
  { id: 'bow', order: 4, name: '弓', icon: 'bow' },
  // 転職システム（spec §6.4）で増えた種類
  { id: 'fist', order: 5, name: '拳', icon: 'fist' },
  { id: 'tome', order: 6, name: '魔導書', icon: 'tome' },
  { id: 'scepter', order: 7, name: '錫杖', icon: 'scepter' },
  { id: 'dagger', order: 8, name: '短剣', icon: 'dagger' },
  { id: 'spear', order: 9, name: '槍', icon: 'spear' },
  { id: 'katana', order: 10, name: '刀', icon: 'katana' },
];
