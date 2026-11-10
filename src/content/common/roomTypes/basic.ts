// ダンジョンの部屋の種類。behavior が動き（src/engine/game/rooms/）、それ以外は数値と見た目
import type { RoomTypeDef } from '../../../types';

export const roomTypes: RoomTypeDef[] = [
  {
    id: 'battle',
    order: 1,
    name: '戦闘',
    icon: 'swords',
    color: '#ff9a7a',
    bg: '#3a1418',
    behavior: 'battle',
    battle: { pool: 'battle', levelBonus: 0, cardOdds: 'battle', consumableDrop: { chance: 25 } },
    layoutWeight: 42,
  },
  {
    id: 'elite',
    order: 2,
    name: '強敵',
    icon: 'skull',
    color: '#ff5a6a',
    bg: '#4a0c18',
    behavior: 'battle',
    omen: 'elite',
    battle: { pool: 'elite', levelBonus: 1, cardOdds: 'elite', equipmentDrop: { epicChance: 10 } },
    layoutWeight: 14,
  },
  { id: 'event', order: 3, name: 'イベント', icon: 'sparkles', color: '#9ad8ff', bg: '#10304a', behavior: 'event', layoutWeight: 16 },
  { id: 'chest', order: 4, name: '宝箱', icon: 'gift', color: '#ffd76a', bg: '#3a2a0a', behavior: 'chest', layoutWeight: 16 },
  { id: 'rest', order: 5, name: '休憩', icon: 'flame', color: '#7dffa8', bg: '#0f3a24', behavior: 'rest', layoutWeight: 12 },
  {
    id: 'boss',
    order: 6,
    name: 'ボス',
    icon: 'crown',
    color: '#ffcf4a',
    bg: '#4a2a06',
    behavior: 'battle',
    battle: { pool: 'boss', levelBonus: 2, cardOdds: 'boss', boss: true },
  },
];
