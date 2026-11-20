import type { ClassDef } from '../../../types';
import { bishop } from './bishop';

export const astrologer: ClassDef = {
  ...bishop, id: 'astrologer', order: 307, name: '占星術師', role: '星に成功の兆しを読む',
  tier: 'special', from: ['bishop'], altar: 'astrologer',
  baseMaxHp: bishop.baseMaxHp + 8,
  stats: { ...bishop.stats, int: bishop.stats.int + 6, luk: bishop.stats.luk + 4 },
  weaponType: 'tome', subWeapons: ['staff'], startingEquipment: { ...bishop.startingEquipment, weapon: 'apprenticeTome' },
  battleAbility: { name: '星読み', effect: { modifier: 'slotPreview', uses: 1 } },
  exploreAbility: { id: 'astrologerExplore', name: '星の道しるべ', description: 'イベントの判定+15%', effect: { kind: 'checkBonus', check: 'event', bonus: 15 } },
  requires: { feat: 'perfects:luk', count: 3, text: '運の判定で完全成功を3回' },
  cardPool: ['cmArcaneArrow', 'gambleGuard', 'samuraiFocus', 'gambleDraw', 'starGift', 'starFall', 'asStarGuide'], signature: ['cmArcaneArrow', 'gambleGuard', 'samuraiFocus'],
  jobCards: ['fxGrandCross'], // 区切りD: 決め技（転職した時に山札へ1枚）
};
