// 寒さ・暑さのある地形（K4 段2）。シナリオの地域が terrain で指定した時だけ使われる（侵食の魔王では使わない）
import type { TerrainDef } from '../../../types';

export const climateTerrains: TerrainDef[] = [
  { id: 'snow', order: 11, name: '雪原', moveCost: 2, color: '#c9d8e6', decor: 'snow', background: 'snow', climate: { kind: 'cold' } },
  { id: 'ice', order: 12, name: '氷原', moveCost: 2, color: '#8fc4de', decor: 'cracks', background: 'snow', climate: { kind: 'cold' } },
  { id: 'desert', order: 13, name: '砂漠', moveCost: 2, color: '#d8b46a', decor: 'dunes', background: 'desert', climate: { kind: 'hot', night: { kind: 'cold' } } },
];
