// ===== 部屋の動きの登録表 =====
// 部屋の種類（src/content の roomTypes）は behavior でここの動きを選ぶ。新しい動き（ショップの部屋など）は behaviors/ にファイルを1つ置く
import { getRoomType } from '../../../data/rules';
import type { Room, RoomTypeDef } from '../../../types';
import type { RoomBehavior } from './types';

export type { RoomBehavior } from './types';

const BEHAVIORS = new Map<string, RoomBehavior>();
for (const [path, mod] of Object.entries(import.meta.glob('./behaviors/*.ts', { eager: true }) as Record<string, { behavior?: RoomBehavior }>)) {
  if (!mod.behavior) throw new Error(`room behavior file without "export const behavior": ${path}`);
  if (BEHAVIORS.has(mod.behavior.id)) throw new Error(`Duplicate room behavior: ${mod.behavior.id}`);
  BEHAVIORS.set(mod.behavior.id, mod.behavior);
}

export const hasRoomBehavior = (id: string) => BEHAVIORS.has(id);
export function roomBehavior(id: string): RoomBehavior {
  const b = BEHAVIORS.get(id);
  if (!b) throw new Error(`Unknown room behavior: ${id}`);
  return b;
}

export const roomTypeOf = (room: Pick<Room, 'type'>): RoomTypeDef => getRoomType(room.type);
/** ボスの部屋か */
export const isBossRoom = (room: Pick<Room, 'type'> | undefined) => !!room && !!roomTypeOf(room).battle?.boss;
