import type { ClassDef } from '../../../types';
import { swordmaster } from './swordmaster';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const swordSaint: ClassDef = {
  ...swordmaster, id: 'swordSaint', order: 201, name: '剣聖', role: '二の太刀で戦局を変える最上位職',
  tier: 'top', from: ['swordmaster'],
  baseMaxHp: swordmaster.baseMaxHp + 10,
  stats: { ...swordmaster.stats, str: swordmaster.stats.str + 8, dex: swordmaster.stats.dex + 8 },
  battleAbility: { name: '二の太刀', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'oncePerTurn', key: 'repeatPhysical' }], do: [{ kind: 'repeatCard' }] } },
  exploreAbility: { id: 'swordSaintExplore', name: '剣気', description: '奇襲の判定+25%', effect: { kind: 'checkBonus', check: 'ambush', bonus: 25 } },
  requires: { feat: 'perfects', count: 15, text: '完全成功15回' },
  cardPool: ["saintSlash","heavenBlade","swordSanctuary","calmBlade","saintFinale"], signature: ["saintSlash","heavenBlade","swordSanctuary"],
};
