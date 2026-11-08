// ===== 扉の気配（第3段階C1） =====
// 部屋の中身は扉を開けるまで分からない。ただし、気配が分かるパーティ（感知が高い・フクロウ・霊感）や「周囲の警戒」に
// 成功した時は、開けられる扉のおおまかな種類（危険・財宝・安らぎ・不思議）だけ分かる。乱数は使わず、今の状態から毎回計算する。
import { BALANCE } from '../../data/balance';
import { getRoomType } from '../../data/rules';
import type { GameState, Hero, Room } from '../../types';
import { statChance } from './common';
import { exploreEffects } from './exploreAbilities';
import { cellKey, dungeonGrid } from './dungeonMap';
import { reachableRooms } from './dungeon';

/** 気配の種類 */
export type DoorOmen = 'danger' | 'treasure' | 'rest' | 'mystery';

export const OMEN_INFO: Record<DoorOmen, { name: string; color: string }> = {
  danger: { name: '危険', color: '#ff5a5a' },
  treasure: { name: '財宝', color: '#ffd24a' },
  rest: { name: '安らぎ', color: '#6aff9a' },
  mystery: { name: '不思議', color: '#6ab8ff' },
};

/** 部屋の動き → 気配の種類 */
const BY_BEHAVIOR: Record<string, DoorOmen> = { battle: 'danger', chest: 'treasure', rest: 'rest', event: 'mystery' };

/** このキャラがいると扉の気配が分かるか（感知の成功率が高い・フクロウのお供・霊感の探索能力） */
export function heroSensesDoors(h: Hero): boolean {
  if (h.hp <= 0 || h.retired) return false;
  if (statChance(h, 'per') >= BALANCE.dungeonSensePer) return true;
  if (h.pet?.petId === 'owl') return true;
  return exploreEffects(h).some((e) => e.kind === 'sense');
}

/** 今の場面のパーティ */
const partyOf = (game: GameState) => game.heroes.filter((h) => !game.party || game.party.includes(h.id));

/** 扉の気配が分かるパーティか */
export const partySensesDoors = (game: GameState) => partyOf(game).some(heroSensesDoors);

/** その部屋の扉の気配（分からなければ undefined）。ボスの扉は見て分かるので気配は出さない。入った部屋も出さない */
export function doorOmen(game: GameState, room: Room): DoorOmen | undefined {
  const run = game.dungeon;
  if (!run || room.cleared || room.id === run.currentRoomId) return undefined;
  const t = getRoomType(room.type);
  if (t.battle?.boss) return undefined;
  const omen = BY_BEHAVIOR[t.behavior];
  if (!omen) return undefined;
  if (run.sensed?.includes(room.id)) return omen;
  if (!reachableRooms(run).some((r) => r.id === room.id)) return undefined;
  // 気配が分かるパーティは、見えている開けられる扉の気配が分かる
  const c = dungeonGrid(run).roomCell.get(room.id);
  if (!c || !(run.seen ?? []).includes(cellKey(c.x, c.y))) return undefined;
  return partySensesDoors(game) ? omen : undefined;
}

/** 今の通路の目印（周囲の警戒は1つの通路で1回だけ） */
export const watchSpot = (game: GameState) => game.dungeon?.currentRoomId ?? 'entrance';
