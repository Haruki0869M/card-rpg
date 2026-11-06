// 状態異常の登録表。src/content の statuses フォルダにファイルを置くだけで登場する
import type { StatusDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const STATUSES = contentRegistry<StatusDef>('status', import.meta.glob('/src/content/**/statuses/*.ts', { eager: true }) as ContentModules);
export const getStatus = (id: string) => STATUSES.get(id);
