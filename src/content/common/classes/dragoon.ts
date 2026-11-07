import type { ClassDef } from '../../../types';
import { lancer } from './lancer';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const dragoon: ClassDef = {
  ...lancer, id: 'dragoon', order: 208, name: '竜騎士', role: '竜のブレスで戦局を変える最上位職',
  tier: 'top', from: ['lancer'],
  baseMaxHp: lancer.baseMaxHp + 10,
  stats: { ...lancer.stats, str: lancer.stats.str + 8, vit: lancer.stats.vit + 8 },
  battleAbility: { name: '竜のブレス', effect: { when: 'turnEnd', do: [{ kind: 'damage', amount: 4, to: 'foes' }] } },
  exploreAbility: { id: 'dragoonExplore', name: '竜の翼', description: '移動力の判定のスロット+2', effect: { kind: 'moveSlots', slots: 2 } },
  requires: { feat: 'kills:big', count: 3, text: '大きな敵を3体倒す' },
  cardPool: ["dragonDive","dragonScale","dragonSweep","dragonSpirit","jump"], signature: ["dragonDive","dragonScale","dragonSweep"],
  jobCards: ['jump'],
};
