// 難易度。冒険の準備の画面に並ぶ（order の順）
import type { DifficultyDef } from '../../../types';

export const difficulties: DifficultyDef[] = [
  { id: 'easy', order: 1, name: 'やさしい', enemyLevel: -1 },
  { id: 'normal', order: 2, name: 'ふつう', enemyLevel: 0 },
  { id: 'hard', order: 3, name: 'むずかしい', enemyLevel: 1 },
];
