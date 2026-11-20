import type { ClassDef } from '../../../types';
import { lancer } from './lancer';

// 最上位: 元の職の装備・名前・成長傾向を引き継ぎ、得意な能力を伸ばす。
export const dragoon: ClassDef = {
  ...lancer, id: 'dragoon', order: 208, name: '竜騎士', role: '竜のブレスで戦局を変える最上位職',
  tier: 'top', from: ['lancer'],
  baseMaxHp: lancer.baseMaxHp + 10,
  stats: { ...lancer.stats, str: lancer.stats.str + 8, vit: lancer.stats.vit + 8 },
  battleAbility: { name: '竜のブレス', effect: { when: 'turnEnd', do: [{ kind: 'damage', amount: 4, to: 'foes' }] } },
  exploreAbility: { id: 'dragoonExplore', name: '竜の翼', description: '移動のサイコロ+1', effect: { kind: 'moveSlots', slots: 1 } },
  // 2026-11-14（案A・オーナーの返事）: 槍騎士の《突撃》の「最初の一撃」。前は「大きな敵を2体倒す」（大きな敵は2つ目の鍵までにほとんど出ず、届かなかった）。
  // 数は growth.sim（4人C・40種）で、槍騎士の人の鍵2を終えた時の数の25%点（docs/review/2026-11-14-dragoon-condition.md）
  requires: { feat: 'success:physical:turn1', count: 10, text: '戦闘の1ターン目に物理カードを10回成功させる' },
  cardPool: ["dragonDive","dragonScale","dragonSweep","hawkFocus","jump"], signature: ["dragonDive","dragonScale","dragonSweep"],
  jobCards: ['jump'],
};
