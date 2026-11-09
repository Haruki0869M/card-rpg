import type { ClassDef } from '../../../types';
import { BALANCE } from '../../../data/balance';
import { archmage } from './archmage';

// 特殊職: 中位の転職できるLv（BALANCE.jobChange.special）と実績を満たし、神殿か対応する祭壇で転職する。
export const timeMage: ClassDef = {
  ...archmage, id: 'timeMage', order: 303, name: '時魔道士', role: '時を止めて好機を作る',
  tier: 'special', from: ['archmage'], altar: 'timeMage',
  baseMaxHp: archmage.baseMaxHp + 8,
  stats: { ...archmage.stats, int: archmage.stats.int + 6, per: archmage.stats.per + 4 },
  weaponType: 'tome', subWeapons: ['staff'],
  startingEquipment: { ...archmage.startingEquipment, weapon: 'apprenticeTome' },
  battleAbility: { name: '時間の余白', effect: { when: 'turnStart', if: [{ kind: 'turnAtMost', turn: 1 }], do: [{ kind: 'gainMana', amount: BALANCE.specialJobs.firstTurnMana }] } },
  exploreAbility: { id: 'timeMageExplore', name: '時の直感', description: 'イベントの判定+15%', effect: { kind: 'checkBonus', check: 'event', bonus: 15 } },
  requires: { feat: 'mana', count: 200, text: 'マナを合わせて200使う' },
  cardPool: ['timeArrow', 'timeShield', 'timeHaste', 'timeStop', 'timeMend', 'timeCollapse'], signature: ['timeArrow', 'timeShield', 'timeHaste'],
  jobCards: ['timeStop'],
};
