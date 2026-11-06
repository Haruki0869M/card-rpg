// イベントの部屋
import { EVENTS } from '../../../../data/events';
import type { RoomBehavior } from '../types';

export const behavior: RoomBehavior = {
  id: 'event',
  enter(game, room) {
    game.event = { roomId: room.id, eventId: room.eventId ?? EVENTS.forScenario(game.scenarioId)[0].id };
    game.mode = 'event';
  },
};
