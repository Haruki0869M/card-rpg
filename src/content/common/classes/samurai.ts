import type { ClassDef } from '../../../types';
import { BALANCE } from '../../../data/balance';
import { swordmaster } from './swordmaster';

// 特殊職: 中位の転職できるLv（BALANCE.jobChange.special）と実績を満たし、神殿か対応する祭壇で転職する。
export const samurai: ClassDef = {
  ...swordmaster, id: 'samurai', order: 301, name: '侍', role: '静かに力を蓄えて斬る',
  tier: 'special', from: ['swordmaster'], altar: 'samurai',
  baseMaxHp: swordmaster.baseMaxHp + 8,
  stats: { ...swordmaster.stats, agi: swordmaster.stats.agi + 6, dex: swordmaster.stats.dex + 4 },
  weaponType: 'katana', subWeapons: ['sword'],
  startingEquipment: { ...swordmaster.startingEquipment, weapon: 'plainKatana' },
  battleAbility: { name: '居合', effect: { when: 'turnEnd', if: [{ kind: 'playedAtMost', count: 0 }], do: [{ kind: 'chargeAttack', factor: BALANCE.specialJobs.chargeFactor, max: BALANCE.specialJobs.chargeMax, category: 'physical' }] } },
  exploreAbility: { id: 'samuraiExplore', name: '心眼', description: '障害物の判定+15%', effect: { kind: 'checkBonus', check: 'obstacle', bonus: 15 } },
  requires: { feat: 'kills:weapon:katana', count: 6, text: '刀を装備して敵を6体倒す' },
  cardPool: ['lnGiQuick', 'cmGrit', 'samuraiSwallow', 'samuraiFocus', 'lnGiFeint', 'samuraiMoon', 'smStillStance'], signature: ['lnGiQuick', 'cmGrit', 'samuraiSwallow'],
  jobCards: ['fxMumyou'], // 区切りD: 決め技（転職した時に山札へ1枚）
};
