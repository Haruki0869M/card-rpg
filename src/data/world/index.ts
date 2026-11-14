// 世界マップの登録表（地形・町・祠・依頼）。src/content の各フォルダにファイルを置くだけで増やせる
import type { QuestDef, ScourgeDef, ShrineDef, SanctuaryDef, TerrainDef, TownDef } from '../../types';
import { contentRegistry, type ContentModules } from '../content';

export const TERRAINS = contentRegistry<TerrainDef>('terrain', import.meta.glob('/src/content/**/terrains/*.ts', { eager: true }) as ContentModules);
export const TOWNS = contentRegistry<TownDef>('town', import.meta.glob('/src/content/**/towns/*.ts', { eager: true }) as ContentModules);
export const SHRINES = contentRegistry<ShrineDef>('shrine', import.meta.glob('/src/content/**/shrines/*.ts', { eager: true }) as ContentModules);
export const QUESTS = contentRegistry<QuestDef>('quest', import.meta.glob('/src/content/**/quests/*.ts', { eager: true }) as ContentModules);
export const SANCTUARIES = contentRegistry<SanctuaryDef>('sanctuary', import.meta.glob('/src/content/**/sanctuaries/*.ts', { eager: true }) as ContentModules);

/** 災厄の中ボス（段階7b）。src/content/common/scourges/ の直下のファイル（敵のデータは scourges/enemies/ に分けて置く） */
export const SCOURGES = contentRegistry<ScourgeDef>('scourge', import.meta.glob('/src/content/**/scourges/*.ts', { eager: true }) as ContentModules);

export const getTerrain = (id: string) => TERRAINS.get(id);
