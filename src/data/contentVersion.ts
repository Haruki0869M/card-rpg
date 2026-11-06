// ===== コンテンツの版（データの中身の指紋） =====
// オンライン協力（M3）で、全員が同じデータで遊んでいるかを確かめるのに使う。
// データが1文字でも違えば値が変わる（同じ乱数でも結果がずれるため、違う版どうしでは一緒に遊べない）
import { CARDS } from './cards';
import { CLASSES } from './classes';
import { DUNGEONS } from './dungeons';
import { ENCOUNTERS, ENEMIES } from './enemies';
import { EVENTS } from './events';
import { ITEMS } from './items';
import { DIFFICULTIES, ROOM_TYPES, WEAPON_TYPES } from './rules';
import { SCENARIOS } from './scenarios';
import { STATUSES } from './statuses';
import { BALANCE } from './balance';

/** 32bit の FNV-1a を2回（違う初期値）で 16桁 */
function hash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

let cached: string | undefined;
export function contentVersion(): string {
  cached ??= hash(
    JSON.stringify([
      BALANCE,
      CLASSES.all,
      CARDS.all,
      ITEMS.all,
      ENEMIES.all,
      ENCOUNTERS.all,
      STATUSES.all,
      DUNGEONS.all,
      EVENTS.all,
      SCENARIOS.all,
      WEAPON_TYPES.all,
      DIFFICULTIES.all,
      ROOM_TYPES.all,
    ]),
  );
  return cached;
}
