// ダンジョンの登録表。src/content の dungeons フォルダ にファイルを置くだけで登場する
// シナリオダンジョンは部屋の並びが固定（layout）、ランダムダンジョン（random: true）は自動生成
import type { DungeonDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const DUNGEONS = contentRegistry<DungeonDef>('dungeon', import.meta.glob('/src/content/**/dungeons/*.ts', { eager: true }) as ContentModules);
