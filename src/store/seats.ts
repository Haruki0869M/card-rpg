// ===== この端末で2人以上の時の「担当プレイヤー」の決め方（フェーズ3 項目3。純粋な関数） =====
// solo = 1人で全員を操作（全員 P1）、pass = スマホを回して操作（1人目 P1・2人目 P2…）、custom = キャラごとに手で決めた形
import type { PlayerId } from '../types';
import { PLAYER_IDS } from './battleConfig';

export type SeatMode = 'solo' | 'pass' | 'custom';

/** 2択で選んだ形に、全員の担当をまとめて書き換える */
export function assignSeats<T extends { playerId?: PlayerId }>(party: readonly T[], mode: 'solo' | 'pass'): T[] {
  return party.map((m, i) => ({ ...m, playerId: mode === 'solo' ? PLAYER_IDS[0] : PLAYER_IDS[i % PLAYER_IDS.length] }));
}

/** 今の担当がどちらの形か（どちらでもなければ custom） */
export function seatModeOf(party: readonly { playerId?: PlayerId }[]): SeatMode {
  const ids = party.map((m) => m.playerId ?? PLAYER_IDS[0]);
  if (ids.every((p) => p === PLAYER_IDS[0])) return 'solo';
  if (ids.every((p, i) => p === PLAYER_IDS[i])) return 'pass';
  return 'custom';
}
