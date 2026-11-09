import type { ClassDef } from '../../../types';
import { swordmaster } from './swordmaster';

// 特殊職: 中位の転職できるLv（BALANCE.jobChange.special）と実績を満たし、神殿か対応する祭壇で転職する。
export const magicKnight: ClassDef = {
  ...swordmaster, id: 'magicKnight', order: 302, name: '魔剣士', role: '魔法の属性を剣へ宿す',
  tier: 'special', from: ['swordmaster'], altar: 'magicKnight',
  baseMaxHp: swordmaster.baseMaxHp + 8,
  stats: { ...swordmaster.stats, str: swordmaster.stats.str + 6, int: swordmaster.stats.int + 4 },
  weaponType: 'sword', subWeapons: ['staff'],
  startingEquipment: { ...swordmaster.startingEquipment, weapon: 'copperSword' },
  battleAbility: { name: '魔法剣', effect: { when: 'afterCard', if: [{ kind: 'cardCategory', category: 'magic' }], do: [{ kind: 'rememberElement' }] } },
  exploreAbility: { id: 'magicKnightExplore', name: '魔紋の知識', description: '石碑・魔法陣の判定+15%', effect: { kind: 'checkBonus', check: 'arcane', bonus: 15 } },
  requires: { feat: 'kills:element', count: 10, text: '属性攻撃で敵を10体倒す' },
  cardPool: ['bladeFire', 'bladeIce', 'bladeStrike', 'bladeThunder', 'bladeBarrier', 'bladeRelease'], signature: ['bladeFire', 'bladeIce', 'bladeStrike'],
};
