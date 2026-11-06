// 戦闘の部屋: 生成済みの敵と戦う
import { startRoomBattle } from '../../game';
import type { RoomBehavior } from '../types';

export const behavior: RoomBehavior = {
  id: 'battle',
  enter: (game, room, rng) => startRoomBattle(game, room, rng),
};
