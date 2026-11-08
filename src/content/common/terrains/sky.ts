// 空の地形（K4 星降る天空城）。雲の道。シナリオの地域が terrain で指定した時だけ使われる
import type { TerrainDef } from '../../../types';

export const skyTerrains: TerrainDef[] = [
  { id: 'cloud', order: 15, name: '雲の道', moveCost: 1, color: '#d9e4f4', decor: 'snow', background: 'cloud' },
];
