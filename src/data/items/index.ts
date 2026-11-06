// 装備品・消費アイテムの登録表。src/content の items フォルダ にファイルを置くだけで登場する
import type { ItemDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const ITEMS = contentRegistry<ItemDef>('item', import.meta.glob('/src/content/**/items/*.ts', { eager: true }) as ContentModules);
export const getItem = (id: string) => ITEMS.get(id);

/** 消費アイテムの袋の上限（1人あたり） */
export const POUCH_LIMIT = 4;
