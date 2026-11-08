// 海（K4 段3）。船が無いと通れない。シナリオの地域が terrain で指定した時だけ使われる（侵食の魔王では使わない）
import type { TerrainDef } from '../../../types';

export const seaTerrains: TerrainDef[] = [
  { id: 'sea', order: 14, name: '海', moveCost: 0, sea: true, shipCost: 1, color: '#245f8f', decor: 'waves', background: 'plains' },
];
