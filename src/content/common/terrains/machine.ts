// 機械の地形（K4 機械仕掛けの帝国）。シナリオの地域が terrain で指定した時だけ使われる
// 蒸気の地（steam）は、立ったままターンが終わると暑さでHPが減る（昼夜とも）
import type { TerrainDef } from '../../../types';

export const machineTerrains: TerrainDef[] = [
  { id: 'metal', order: 16, name: '鉄の床', moveCost: 1, color: '#7c8794', decor: 'cracks', background: 'castle' },
  { id: 'steam', order: 17, name: '蒸気の地', moveCost: 2, color: '#b7c2cc', decor: 'cracks', background: 'volcano', climate: { kind: 'hot' } },
];
