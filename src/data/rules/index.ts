// 小さなルールの登録表（武器の種類・難易度・部屋の種類）。src/content の各フォルダにファイルを置くだけで増やせる
import type { DifficultyDef, RoomTypeDef, WeaponTypeDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const WEAPON_TYPES = contentRegistry<WeaponTypeDef>('weaponType', import.meta.glob('/src/content/**/weaponTypes/*.ts', { eager: true }) as ContentModules);
export const DIFFICULTIES = contentRegistry<DifficultyDef>('difficulty', import.meta.glob('/src/content/**/difficulties/*.ts', { eager: true }) as ContentModules);
export const ROOM_TYPES = contentRegistry<RoomTypeDef>('roomType', import.meta.glob('/src/content/**/roomTypes/*.ts', { eager: true }) as ContentModules);

export const getDifficulty = (id: string) => DIFFICULTIES.tryGet(id) ?? DIFFICULTIES.all[0];
export const getRoomType = (id: string) => ROOM_TYPES.get(id);

/** 難易度の説明文（データに description が無ければ数値から作る） */
export function describeDifficulty(d: DifficultyDef): string {
  if (d.description) return d.description;
  const parts: string[] = [];
  if (d.enemyLevel) parts.push(`敵のレベル${d.enemyLevel > 0 ? '+' : ''}${d.enemyLevel}`);
  if (d.enemyHp && d.enemyHp !== 1) parts.push(`敵のHP×${d.enemyHp}`);
  if (d.enemyAttack && d.enemyAttack !== 1) parts.push(`敵の攻撃×${d.enemyAttack}`);
  if (d.reward && d.reward !== 1) parts.push(`報酬×${d.reward}`);
  if (d.corruptionPerTurn !== undefined) parts.push(`侵食度+${d.corruptionPerTurn}%/巡`);
  return parts.join('・') || '標準';
}
