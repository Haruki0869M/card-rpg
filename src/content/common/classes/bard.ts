import type { ClassDef } from '../../../types';
import { BALANCE } from '../../../data/balance';
import { phantomThief } from './phantomThief';

export const bard: ClassDef = {
  ...phantomThief, id: 'bard', order: 309, name: '吟遊詩人', role: '歌で仲間の力を引き出す',
  tier: 'special', from: ['phantomThief'], altar: 'bard',
  baseMaxHp: phantomThief.baseMaxHp + 8,
  stats: { ...phantomThief.stats, luk: phantomThief.stats.luk + 6, per: phantomThief.stats.per + 4 },
  weaponType: 'instrument', subWeapons: ['dagger'], startingEquipment: { ...phantomThief.startingEquipment, weapon: 'travelerLute' },
  battleAbility: { name: '歌の余韻', effect: { when: 'afterCard', if: [{ kind: 'supportedOthers' }, { kind: 'oncePerTurn', key: 'songAfterglow' }], do: [{ kind: 'block', amount: BALANCE.specialJobs.supportBlock }] } },
  exploreAbility: { id: 'bardExplore', name: '旅の歌', description: 'イベントの判定+15%', effect: { kind: 'checkBonus', check: 'event', bonus: 15 } },
  requires: { feat: 'support:others', count: 12, text: '仲間を助けるカードを12回' },
  cardPool: ['bardCourage', 'bardFocus', 'bardHeal', 'maidenWard', 'bardStrike', 'bardFinale', 'axAssistPass', 'axRoundSong'], signature: ['bardCourage', 'bardFocus', 'bardHeal'],
};
