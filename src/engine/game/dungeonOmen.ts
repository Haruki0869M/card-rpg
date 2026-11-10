// ===== 扉の予兆（抜本的な見直し §2-4） =====
// 次の行の扉は、だれでも・いつでも種類（5色）が分かる。乱数は使わず、今の状態から毎回計算する。
// 先読み（2段階目）: 感知が高いキャラ・フクロウのお供・霊感がいるか、その通路で「周囲の警戒」（フォーカス1）を使うと、
// 扉の先の具体的な中身（敵の名前・宝箱の格・イベントの題）と、その次の行の扉の色まで分かる。
import { BALANCE } from '../../data/balance';
import { getEnemy } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { getRoomType } from '../../data/rules';
import { CHEST_NAME } from '../../data/terms';
import type { DungeonRun, GameState, Hero, Room } from '../../types';
import { statChance } from './common';
import { exploreEffects } from './exploreAbilities';
import { depthTier, DEPTH_TIER_NAME, findRoom, isLegacyLayout, reachableRooms } from './dungeon';

/** 予兆の種類（赤=通常の戦闘・紫=強敵・金=宝・緑=休憩・青=イベント） */
export type DoorOmen = 'danger' | 'elite' | 'treasure' | 'rest' | 'mystery';
/** 扉の見た目（ふつうの扉・中ボスの重い扉・ボスの門） */
export type DoorKind = 'door' | 'midboss' | 'boss';

export const OMEN_INFO: Record<DoorOmen, { name: string; color: string; text: string }> = {
  danger: { name: '魔物の群れ', color: '#ff5a5a', text: 'カード報酬＋ゴールド' },
  elite: { name: '強敵の棲処', color: '#c98bff', text: '高難度・レア以上と装備が出やすい' },
  treasure: { name: '宝物庫', color: '#ffd24a', text: '宝箱' },
  rest: { name: '焚き火の休憩所', color: '#6aff9a', text: 'HP回復・フォーカス回復・技を磨く' },
  mystery: { name: '未知の出来事', color: '#6ab8ff', text: '能力アップ・取引など' },
};

/** 部屋の動き → 予兆（部屋の種類のデータに omen があればそれ） */
const BY_BEHAVIOR: Record<string, DoorOmen> = { battle: 'danger', chest: 'treasure', rest: 'rest', event: 'mystery' };

/** 部屋の種類だけで決まる予兆（ボス・中ボスは扉の見た目で分かるので無し） */
export function omenOfType(type: string): DoorOmen | undefined {
  const t = getRoomType(type);
  if (t.battle?.boss || t.heavyDoor) return undefined;
  return t.omen ?? BY_BEHAVIOR[t.behavior];
}

/** 扉の見た目（ボスの門・中ボスの重い扉・ふつうの扉） */
export function doorKind(room: Pick<Room, 'type'>): DoorKind {
  const t = getRoomType(room.type);
  return t.battle?.boss ? 'boss' : t.heavyDoor ? 'midboss' : 'door';
}

/** このキャラがいると先読みができるか（感知の成功率が高い・フクロウのお供・霊感の探索能力） */
export function heroSensesDoors(h: Hero): boolean {
  if (h.hp <= 0 || h.retired) return false;
  if (statChance(h, 'per') >= BALANCE.dungeonSensePer) return true;
  if (h.pet?.petId === 'owl') return true;
  return exploreEffects(h).some((e) => e.kind === 'sense');
}

/** 今の場面のパーティ */
const partyOf = (game: GameState) => game.heroes.filter((h) => !game.party || game.party.includes(h.id));

/** 先読みができるパーティか（警戒しなくても） */
export const partySensesDoors = (game: GameState) => partyOf(game).some(heroSensesDoors);

/** 今の通路の目印（周囲の警戒は1つの通路で1回だけ） */
export const watchSpot = (game: GameState) => game.dungeon?.currentRoomId ?? 'entrance';

/** この通路で、まだ「周囲の警戒」ができるか */
export const canWatchHere = (run: DungeonRun) => run.watchedAt !== (run.currentRoomId ?? 'entrance');

/** 今の通路で先読み（2段階目）が見えるか: 感知・フクロウ・霊感のだれかがいる、または、この通路で警戒した */
export function hasForesight(game: GameState): boolean {
  const run = game.dungeon;
  if (!run) return false;
  return partySensesDoors(game) || !canWatchHere(run);
}

/** 今開けられる扉か（次の行の、まだ入っていない部屋） */
const isNextDoor = (run: DungeonRun, room: Room) => !room.cleared && room.id !== run.currentRoomId && reachableRooms(run).some((r) => r.id === room.id);

/** その部屋の扉の予兆（次の行の扉なら、だれでも・いつでも分かる）。ボス・中ボスは扉の見た目で分かるので出さない。入った部屋も出さない */
export function doorOmen(game: GameState, room: Room): DoorOmen | undefined {
  const run = game.dungeon;
  if (!run || !isNextDoor(run, room)) return undefined;
  return omenOfType(room.type);
}

/** 敵の名前の並び（同じ敵は「×2」とまとめる） */
function enemyNames(room: Room): string {
  const count = new Map<string, number>();
  for (const e of room.enemies ?? []) count.set(e.defId, (count.get(e.defId) ?? 0) + 1);
  return [...count.entries()].map(([id, n]) => `${getEnemy(id).name}${n > 1 ? `×${n}` : ''}`).join('・');
}

/** 先読みの中身（敵の名前・宝箱の格・イベントの題）。先読みができない時・次の行の扉でない時は undefined */
export function doorDetail(game: GameState, room: Room): string | undefined {
  const run = game.dungeon;
  if (!run || !isNextDoor(run, room) || !hasForesight(game)) return undefined;
  const t = getRoomType(room.type);
  if (t.battle) return enemyNames(room) || undefined;
  if (t.behavior === 'chest') return `${CHEST_NAME[room.chest?.rarity ?? 'common']}${room.chest?.locked ? '（鍵つき）' : ''}`;
  if (t.behavior === 'event') return room.eventId ? EVENTS.tryGet(room.eventId)?.title : undefined;
  return undefined;
}

/** 先読みで分かる「その扉の次の行の扉」（左から。予兆の色か、ボスの門・中ボスの扉）。先読みができない時は空 */
export function doorBeyond(game: GameState, room: Room): (DoorOmen | 'boss' | 'midboss')[] {
  const run = game.dungeon;
  if (!run || !isNextDoor(run, room) || !hasForesight(game)) return [];
  return room.next
    .map((id) => findRoom(run, id))
    .filter((r): r is Room => !!r)
    .sort((a, b) => a.col - b.col)
    .map((r) => {
      const k = doorKind(r);
      return k === 'door' ? (omenOfType(r.type) ?? 'mystery') : k;
    });
}

/** その扉の先の深層ボーナスの文（例「深層：報酬+50%」。ボーナスが無い行・古い形のダンジョンは undefined） */
export function doorDepthBonus(run: DungeonRun, room: Room): string | undefined {
  if (isLegacyLayout(run) || !getRoomType(room.type).battle) return undefined;
  const tier = depthTier(room.row);
  if (tier <= 0) return undefined;
  return `${DEPTH_TIER_NAME[tier]}：報酬+${Math.round(BALANCE.depthBonus.reward[tier] * 100)}%`;
}
