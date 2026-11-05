// イベントの登録表。src/content の events フォルダ にファイルを置くだけで登場する（シナリオ専用のものはそのシナリオだけで出る）
import type { EventDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const EVENTS = contentRegistry<EventDef>('event', import.meta.glob('/src/content/**/events/*.ts', { eager: true }) as ContentModules);
