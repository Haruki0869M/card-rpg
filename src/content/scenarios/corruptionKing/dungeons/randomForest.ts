// ランダムダンジョン: 迷いの森の洞窟（部屋の並びを自動生成）
import type { DungeonDef } from '../../../../types';
import { FOREST_POOLS } from './pools';

export const randomForest: DungeonDef = {
  id: 'randomForest',
  name: '迷いの森の洞窟',
  description: '訪れるたびに姿を変える洞窟。危険だが、奥には豪華な財宝が眠る。',
  background: 'temple',
  baseLevel: 4,
  pools: { ...FOREST_POOLS, boss: ['treeWarden', 'toxicShroom'] },
  bossChest: 'legend',
  // 拠点に戻るたびに中身が変わる（クリアした数だけ敵が強くなる）
  random: true,
  rows: 6,
};
