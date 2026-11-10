import type { ClassDef } from '../../../types';
import { brawler } from './brawler';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const fistKing: ClassDef = {
  ...brawler, id: 'fistKing', order: 203, name: '拳王', role: '百裂拳で戦局を変える最上位職',
  tier: 'top', from: ['brawler'],
  baseMaxHp: brawler.baseMaxHp + 10,
  stats: { ...brawler.stats, str: brawler.stats.str + 8, agi: brawler.stats.agi + 8 },
  battleAbility: { name: '百裂拳', effect: { when: 'turnEnd', do: [{ kind: 'playedDamage', per: 2 }] } },
  exploreAbility: { id: 'fistKingExplore', name: '拳圧', description: '障害物の判定+30%', effect: { kind: 'checkBonus', check: 'obstacle', bonus: 30 } },
  requires: { feat: 'success:physical', count: 35, text: '物理カードの成功35回' },
  cardPool: ["hundredFists","kingCounter","fistFlurry","breathControl","earthShatter"], signature: ["hundredFists","kingCounter","fistFlurry"],
};
