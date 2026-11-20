// ダンジョンの登録表。src/content の dungeons フォルダ にファイルを置くだけで登場する
// シナリオダンジョンは部屋の並びが固定（layout）、ランダムダンジョン（random: true）は自動生成
import type { DungeonDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const DUNGEONS = contentRegistry<DungeonDef>('dungeon', import.meta.glob('/src/content/**/dungeons/*.ts', { eager: true }) as ContentModules);

/**
 * 鍵の順番で1つ目のダンジョンか（2026-11-13）: 鍵をくれる（rewardKey）のに、入るのに鍵が要らない（requiresKeys が無い）、ランダムでないダンジョン。
 * データだけで決める（7本とも、この形のダンジョンは1つずつ。dungeonFirstKey のテストで確かめる）
 */
export const isFirstKeyDungeon = (def: Pick<DungeonDef, 'rewardKey' | 'requiresKeys' | 'random'>) => !def.random && !!def.rewardKey && !def.requiresKeys?.length;
