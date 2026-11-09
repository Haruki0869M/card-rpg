import type { ClassDef } from '../../../types';
import { BALANCE } from '../../../data/balance';
import { hexer } from './hexer';

// 特殊職: 中位の転職できるLv（BALANCE.jobChange.special）と実績を満たし、神殿か対応する祭壇で転職する。
export const necromancer: ClassDef = {
  ...hexer, id: 'necromancer', order: 304, name: '死霊術師', role: '倒した敵を屍兵へ変える',
  tier: 'special', from: ['hexer'], altar: 'necromancer',
  baseMaxHp: hexer.baseMaxHp + 8,
  stats: { ...hexer.stats, int: hexer.stats.int + 6, vit: hexer.stats.vit + 4 },
  weaponType: 'scythe', subWeapons: ['tome'],
  startingEquipment: { ...hexer.startingEquipment, weapon: 'rustyScythe' },
  battleAbility: { name: '屍兵', effect: { when: 'kill', do: [{ kind: 'summon', id: 'skeletonSoldier', name: '屍兵', icon: '💀', damage: BALANCE.specialJobs.minionDamage, turns: 99, stackLimit: BALANCE.specialJobs.minionLimit }] } },
  exploreAbility: { id: 'necromancerExplore', name: '死者の知恵', description: '石碑・魔法陣の判定+20%', effect: { kind: 'checkBonus', check: 'arcane', bonus: 20 } },
  requires: { feat: 'kills:cursed', count: 5, text: '呪われた敵を5体倒す' },
  cardPool: ['graveBolt', 'graveCurse', 'graveFeast', 'graveGuard', 'graveWhisper', 'graveFuneral'], signature: ['graveBolt', 'graveCurse', 'graveFeast'],
};
