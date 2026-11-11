import type { ClassDef } from '../../../types';
import { paladin } from './paladin';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const holyKing: ClassDef = {
  ...paladin, id: 'holyKing', order: 207, name: '聖王', role: '再臨で戦局を変える最上位職',
  tier: 'top', from: ['paladin'],
  baseMaxHp: paladin.baseMaxHp + 10,
  stats: { ...paladin.stats, vit: paladin.stats.vit + 8, str: paladin.stats.str + 8 },
  battleAbility: { name: '再臨', effect: { when: 'allyDown', if: [{ kind: 'targetDead' }, { kind: 'perBattle', key: 'resurrection', max: 1 }], do: [{ kind: 'revive', pct: 30 }] } },
  exploreAbility: { id: 'holyKingExplore', name: '王の威光', description: '町の買い物20%引き', effect: { kind: 'shopDiscount', percent: 20 } },
  requires: { feat: 'support', count: 20, text: '仲間を助けるカードを20回使う' },
  cardPool: ["royalHammer","royalAegis","royalGrace","holyOath","royalJudgment","axFortress","axSeraphim","axLightHoard"], signature: ["royalHammer","royalAegis","royalGrace"], subWeapons: ['sword', 'spear'],
};
