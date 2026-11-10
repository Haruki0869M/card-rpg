import type { ClassDef } from '../../../types';
import { BALANCE } from '../../../data/balance';
import { archer } from './archer';

export const machinist: ClassDef = {
  ...archer, id: 'machinist', order: 308, name: '機工士', role: '砲台と罠で戦場を整える',
  tier: 'special', from: ['archer'], altar: 'machinist',
  baseMaxHp: archer.baseMaxHp + 8,
  stats: { ...archer.stats, dex: archer.stats.dex + 6, int: archer.stats.int + 4 },
  weaponType: 'gun', subWeapons: ['bow'], startingEquipment: { ...archer.startingEquipment, weapon: 'antiqueGun' },
  battleAbility: { name: '自動砲台', effect: { when: 'battleStart', do: [{ kind: 'summon', id: 'turret', name: '砲台', icon: '⚙', damage: BALANCE.specialJobs.turretDamage, turns: BALANCE.specialJobs.deviceTurns, replace: true, targeted: true }] } },
  exploreAbility: { id: 'machinistExplore', name: '機構の知恵', description: '鍵開けの判定+20%', effect: { kind: 'checkBonus', check: 'lock', bonus: 20 } },
  requires: { feat: 'checks:mechanism', count: 3, text: '罠・仕掛けの判定を3回成功' },
  cardPool: ['machineShot', 'placeTurret', 'placeTrap', 'machineVolley', 'machineGuard', 'machineCannon'], signature: ['machineShot', 'placeTurret', 'placeTrap'],
};
