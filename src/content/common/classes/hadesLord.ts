import type { ClassDef } from '../../../types';
import { hexer } from './hexer';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const hadesLord: ClassDef = {
  ...hexer, id: 'hadesLord', order: 205, name: '冥王', role: '深淵で戦局を変える最上位職',
  tier: 'top', from: ['hexer'],
  baseMaxHp: hexer.baseMaxHp + 10,
  stats: { ...hexer.stats, int: hexer.stats.int + 8, vit: hexer.stats.vit + 8 },
  battleAbility: { name: '深淵', effect: { when: 'turnStart', do: [{ kind: 'payHp', amount: 3 }, { kind: 'gainMana', amount: 1 }] } },
  exploreAbility: { id: 'hadesLordExplore', name: '瘴気の主', description: '瘴気の判定+30%', effect: { kind: 'checkBonus', check: 'miasma', bonus: 30 } },
  requires: { feat: 'kills:cursed', count: 4, text: '呪われた敵を4体倒す' },
  cardPool: ["abyssScythe","underworldCurse","soulBanquet","bloodOffering","deathJudgment","axCurseReturn"], signature: ["abyssScythe","underworldCurse","soulBanquet"],
};
