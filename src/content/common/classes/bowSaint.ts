import type { ClassDef } from '../../../types';
import { archer } from './archer';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const bowSaint: ClassDef = {
  ...archer, id: 'bowSaint', order: 210, name: '弓聖', role: '必中で戦局を変える最上位職',
  tier: 'top', from: ['archer'],
  baseMaxHp: archer.baseMaxHp + 10,
  stats: { ...archer.stats, per: archer.stats.per + 8, dex: archer.stats.dex + 8 },
  battleAbility: { name: '必中', effect: { modifier: 'completeSlots', if: [{ kind: 'usedFocus' }, { kind: 'cardSingleTarget' }, { kind: 'cardHasDamage' }] } },
  exploreAbility: { id: 'bowSaintExplore', name: '鷹の目', description: '視界+2・奇襲の判定+15%', effect: { kind: 'combined', effects: [{ kind: 'tracking', vision: 2, hiddenFindBonus: 0 }, { kind: 'checkBonus', check: 'ambush', bonus: 15 }] } },
  requires: { feat: 'perfects', count: 12, text: '完全成功12回' },
  cardPool: ["saintArrow","hawkVolley","skyPiercer","hawkFocus","heavenRain"], signature: ["saintArrow","hawkVolley","skyPiercer"],
};
