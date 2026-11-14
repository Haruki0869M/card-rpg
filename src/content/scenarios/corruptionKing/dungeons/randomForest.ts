// ランダムダンジョン: 迷いの森の洞窟（部屋の並びを自動生成）
import type { DungeonDef } from '../../../../types';
import { RANDOM_FOREST_POOLS } from './pools';

export const randomForest: DungeonDef = {
  id: 'randomForest',
  name: '迷いの森の洞窟',
  description: '訪れるたびに姿を変える洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'forestCave',
  baseLevel: 4,
  pools: { ...RANDOM_FOREST_POOLS, boss: ['treeWarden', 'toxicShroom'] },
  bossChest: 'legend',
  // 入るたびに中身が変わる（制覇したダンジョンの数だけ敵が強くなる）。段階7a: 全5行（4行＋ボスの行）。テーマ（並びとご褒美）は地図のマスに記録する
  random: true,
  rows: 4,
};
