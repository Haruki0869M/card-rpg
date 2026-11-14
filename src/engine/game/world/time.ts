// ===== 昼と夜（spec §8.3）: 朝 → 昼 → 夕方 → 夜 を、ワールドターンごとにくり返す =====
import { BALANCE } from '../../../data/balance';
import type { TimeOfDay } from '../../../types';

export const TIMES: TimeOfDay[] = ['morning', 'noon', 'evening', 'night'];
export const TIME_NAME: Record<TimeOfDay, string> = { morning: '朝', noon: '昼', evening: '夕方', night: '夜' };

/** ワールドターン（1から）の時間帯 */
export const timeOfDay = (worldTurn: number): TimeOfDay => TIMES[Math.floor((worldTurn - 1) / BALANCE.turnsPerTimeOfDay) % TIMES.length];

/** 夜まで（夜なら朝まで）あと何ターンか */
export function turnsUntilNightChange(worldTurn: number): { night: boolean; turns: number } {
  const per = BALANCE.turnsPerTimeOfDay;
  const night = timeOfDay(worldTurn) === 'night';
  const day = Math.floor((worldTurn - 1) / (per * TIMES.length));
  const nightStart = day * per * TIMES.length + per * 3 + 1;
  const nextMorning = (day + 1) * per * TIMES.length + 1;
  return { night, turns: night ? nextMorning - worldTurn : nightStart - worldTurn };
}

/** 何日目か */
export const dayOf = (worldTurn: number) => Math.floor((worldTurn - 1) / (BALANCE.turnsPerTimeOfDay * TIMES.length)) + 1;

/** その日の最後のワールドターン（夜の最後。次のターンが次の朝）。温泉の効き目の終わり（シナリオ2の作り直し §8-2） */
export const lastTurnOfDay = (worldTurn: number) => dayOf(worldTurn) * BALANCE.turnsPerTimeOfDay * TIMES.length;
