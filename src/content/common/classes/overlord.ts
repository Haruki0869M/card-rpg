import type { ClassDef } from '../../../types';
import { berserker } from './berserker';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const overlord: ClassDef = {
  ...berserker, id: 'overlord', order: 202, name: '覇王', role: '覇気で戦局を変える最上位職',
  tier: 'top', from: ['berserker'],
  baseMaxHp: berserker.baseMaxHp + 10,
  stats: { ...berserker.stats, str: berserker.stats.str + 8, vit: berserker.stats.vit + 8 },
  battleAbility: { name: '覇気', effect: { when: 'allyKill', do: [{ kind: 'rallyDamage', amount: 0.1, max: 0.5 }] } },
  exploreAbility: { id: 'overlordExplore', name: '威圧', description: '逃げる判定+20%', effect: { kind: 'checkBonus', check: 'flee', bonus: 20 } },
  requires: { feat: 'kills', count: 10, text: '敵を10体倒す' },
  cardPool: ["kingCleaver","domination","conquerorRoar","bloodThrone","worldBreaker"], signature: ["kingCleaver","domination","conquerorRoar"],
};
