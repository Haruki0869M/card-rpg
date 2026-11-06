// 宝箱の部屋
import type { RoomBehavior } from '../types';

export const behavior: RoomBehavior = {
  id: 'chest',
  enter(game, room) {
    game.chest = { roomId: room.id, spec: room.chest ?? { rarity: 'common', locked: false }, unlocked: !room.chest?.locked };
    game.mode = 'chest';
  },
};
