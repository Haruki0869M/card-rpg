// 職業の登録表。src/content の classes フォルダ に職業のファイルを置くだけで登場する
import type { ClassDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const CLASSES = contentRegistry<ClassDef>('class', import.meta.glob('/src/content/**/classes/*.ts', { eager: true }) as ContentModules);

export const getClass = (id: string) => CLASSES.get(id);
