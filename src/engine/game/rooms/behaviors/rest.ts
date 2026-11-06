// 休憩の部屋
import type { RoomBehavior } from '../types';

export const behavior: RoomBehavior = {
  id: 'rest',
  enter(game) {
    game.mode = 'rest';
  },
};
