// 属性の登録表。src/content の elements フォルダにファイルを置くだけで増やせる
import type { ElementDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const ELEMENTS = contentRegistry<ElementDef>('element', import.meta.glob('/src/content/**/elements/*.ts', { eager: true }) as ContentModules);
export const getElement = (id: string) => ELEMENTS.get(id);
