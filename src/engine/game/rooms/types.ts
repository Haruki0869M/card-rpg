// 部屋に入った時の動き1種類分。behaviors/ に1ファイル1種類で置く（export const behavior = ...）
import type { GameState, Room } from '../../../types';
import type { Rng } from '../../rng';

export interface RoomBehavior {
  id: string;
  enter(game: GameState, room: Room, rng: Rng): void;
}
