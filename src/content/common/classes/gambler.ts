import type { ClassDef } from '../../../types';
import { BALANCE } from '../../../data/balance';
import { phantomThief } from './phantomThief';

export const gambler: ClassDef = {
  ...phantomThief, id: 'gambler', order: 310, name: '賭博師', role: '堅実さを残して勝負する',
  tier: 'special', from: ['phantomThief'], altar: 'gambler',
  baseMaxHp: phantomThief.baseMaxHp + 8,
  stats: { ...phantomThief.stats, luk: phantomThief.stats.luk + 6, dex: phantomThief.stats.dex + 4 },
  weaponType: 'dagger', subWeapons: ['instrument'], startingEquipment: { ...phantomThief.startingEquipment, weapon: 'rustyDagger' },
  battleAbility: { name: '勝負勘', effect: { when: 'afterCard', if: [{ kind: 'cardHasDamage' }, { kind: 'successesAtMost', count: 0 }, { kind: 'focusNotFull' }, { kind: 'oncePerTurn', key: 'gambleRecovery' }], do: [{ kind: 'gainFocus', amount: BALANCE.specialJobs.failureFocus }] } },
  exploreAbility: { id: 'gamblerExplore', name: '運の嗅覚', description: '宝箱の運の判定+15%', effect: { kind: 'checkBonus', check: 'luck', bonus: 15 } },
  requires: { feat: 'checks:luk', count: 6, text: '運の判定を6回成功' },
  cardPool: ['gambleStrike', 'gambleTwin', 'gambleGuard', 'samuraiFocus', 'gambleDraw', 'gambleFinale'], signature: ['gambleStrike', 'gambleTwin', 'gambleGuard'],
  jobCards: ['fxAllOrNothing'], // 区切りD: 決め技（転職した時に山札へ1枚）
};
