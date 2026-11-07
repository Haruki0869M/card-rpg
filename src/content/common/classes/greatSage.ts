import type { ClassDef } from '../../../types';
import { archmage } from './archmage';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const greatSage: ClassDef = {
  ...archmage, id: 'greatSage', order: 204, name: '大賢者', role: '万象で戦局を変える最上位職',
  tier: 'top', from: ['archmage'],
  baseMaxHp: archmage.baseMaxHp + 10,
  stats: { ...archmage.stats, int: archmage.stats.int + 8, per: archmage.stats.per + 8 },
  battleAbility: { name: '万象', effect: { modifier: 'weaknessDamage', multiplier: 1.3 } },
  exploreAbility: { id: 'greatSageExplore', name: '叡智', description: 'イベントの判定+20%', effect: { kind: 'checkBonus', check: 'event', bonus: 20 } },
  requires: { feat: 'kills:element', count: 10, text: '属性攻撃で敵を10体倒す' },
  cardPool: ["sageFlame","sageFrost","sageThunder","sageMeditation","elementRevelation"], signature: ["sageFlame","sageFrost","sageThunder"],
};
