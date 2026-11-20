// お供（ペット）の登録表。src/content の pets フォルダにファイルを置くだけで登場する（設計 v2.1 §4）
import type { PetDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const PETS = contentRegistry<PetDef>('pet', import.meta.glob('/src/content/**/pets/*.ts', { eager: true }) as ContentModules);
export const getPet = (id: string) => PETS.get(id);
