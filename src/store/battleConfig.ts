// プレイヤーと名前の決め方
import { CLASSES } from '../data/classes';
import type { Gender, PlayerId } from '../types';

/** この端末のプレイヤー（M3のオンライン協力で部屋ごとに決まる） */
export const LOCAL_PLAYER: PlayerId = 'P1';

/** 職業と性別に合った名前（同じ名前が並ばないよう index でずらす） */
export function autoName(classId: string, gender: Gender, index: number): string {
  const list = CLASSES.get(classId).names[gender];
  return list[index % list.length];
}
