// 地形（spec §8.1）。moveCost 0 は通れない。background はその地形で戦った時の戦闘の背景
import type { TerrainDef } from '../../../types';

export const terrains: TerrainDef[] = [
  { id: 'road', order: 1, name: '街道', moveCost: 1, color: '#b49a6a', decor: 'road', background: 'plains' },
  { id: 'plains', order: 2, name: '平原', moveCost: 1, color: '#6f9a4a', decor: 'grass', background: 'plains' },
  { id: 'forest', order: 3, name: '森', moveCost: 2, color: '#2f6a3a', decor: 'trees', background: 'forest' },
  { id: 'swamp', order: 4, name: '沼', moveCost: 2, color: '#4a5a3e', decor: 'reeds', background: 'swamp' },
  { id: 'hills', order: 5, name: '丘', moveCost: 2, color: '#8a7a52', decor: 'hills', background: 'plains' },
  { id: 'mountain', order: 6, name: '山', moveCost: 3, color: '#6a6066', decor: 'peaks', background: 'volcano' },
  { id: 'ash', order: 7, name: '灰の荒野', moveCost: 2, color: '#5a4a46', decor: 'cracks', background: 'volcano' },
  { id: 'lava', order: 8, name: '溶岩', moveCost: 0, color: '#c24a1a', decor: 'lava', background: 'volcano' },
  { id: 'water', order: 9, name: '湖', moveCost: 0, color: '#2a5a8a', decor: 'waves', background: 'plains' },
  { id: 'blight', order: 10, name: '瘴気の地', moveCost: 2, color: '#3a2448', decor: 'cracks', background: 'castle' },
];
