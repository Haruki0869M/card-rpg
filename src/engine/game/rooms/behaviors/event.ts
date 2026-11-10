// イベントの部屋
import { EVENTS } from '../../../../data/events';
import type { DungeonRun, GameState, Room } from '../../../../types';
import type { Rng } from '../../../rng';
import type { RoomBehavior } from '../types';

/** ダンジョンの部屋で起きるイベント（世界マップ・突発・出現スポット専用は除く） */
const dungeonEvents = (game: GameState) => EVENTS.forScenario(game.scenarioId).filter((e) => !e.where || e.where === 'dungeon').map((e) => e.id);

/**
 * 1つのダンジョンの中で、同じイベントを繰り返さない（オーナー承認）。
 * 部屋に決まっているイベントが、このダンジョンですでに起きていたら（片づいた部屋のイベント）、まだ起きていないイベントに替える。
 * 候補を使い切った時だけ、元のイベントをもう一度出す。乱数はゲームの乱数（rngState）だけを使い、決まったイベントは部屋に書くので、
 * 保存して再開しても・オンラインでも同じになる。保存の形は変わらない（起きたイベントは片づいた部屋から数える）。
 */
export function freshEventId(game: GameState, run: DungeonRun, room: Room, eventId: string, rng: Rng): string {
  const seen = new Set(run.rooms.filter((r) => r !== room && r.cleared && r.eventId).map((r) => r.eventId!));
  if (!seen.has(eventId)) return eventId;
  const left = dungeonEvents(game).filter((id) => !seen.has(id));
  return left.length ? left[rng.int(left.length)] : eventId;
}

export const behavior: RoomBehavior = {
  id: 'event',
  enter(game, room, rng) {
    const first = room.eventId ?? EVENTS.forScenario(game.scenarioId)[0].id;
    room.eventId = game.dungeon ? freshEventId(game, game.dungeon, room, first, rng) : first;
    game.event = { roomId: room.id, eventId: room.eventId };
    game.mode = 'event';
  },
};
