import type { ClassDef } from '../../../types';
import { shadow } from './shadow';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const ninja: ClassDef = {
  ...shadow, id: 'ninja', order: 212, name: '忍者', role: '影分身で戦局を変える最上位職',
  tier: 'top', from: ['shadow'],
  baseMaxHp: shadow.baseMaxHp + 10,
  stats: { ...shadow.stats, agi: shadow.stats.agi + 8, dex: shadow.stats.dex + 8 },
  battleAbility: { name: '影分身', description: '分身2つ。攻撃のたびに各分身が半分の威力で追撃。被弾時は分身1つを消してダメージを0にする', effect: { when: 'battleStart', do: [1, 2].map(n => ({ kind: 'summon' as const, id: `shadowClone${n}`, name: `影分身${n}`, icon: '👤', damage: 0, turns: 99, echoPct: 50, intercept: true })) } },
  exploreAbility: { id: 'ninjaExplore', name: '忍び足', description: '逃げる判定+35%', effect: { kind: 'checkBonus', check: 'flee', bonus: 35 } },
  requires: { feat: 'kills:status', count: 6, text: '状態異常の敵を6体倒す' },
  cardPool: ["lnGiQuick","ninjaVenom","shadowStep","ninjaBreath","nightExecution","axCollapse"], signature: ["lnGiQuick","ninjaVenom","shadowStep"],
  jobCards: ['fxYatagarasu'], // 区切りD: 決め技（転職した時に山札へ1枚）
};
