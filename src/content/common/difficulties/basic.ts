// 難易度。冒険の準備の画面に並ぶ（order の順）
// 目安（自動プレイ・4人・40回）: やさしい 約45%・ふつう 約20%・むずかしい 約5〜10%。SIM=1 npx vitest run balance で確かめる
import type { DifficultyDef } from '../../../types';

export const difficulties: DifficultyDef[] = [
  { id: 'easy', order: 1, name: 'やさしい', enemyLevel: -1, lives: 5, enemyHp: 1.1, enemyAttack: 1.1, corruptionPerTurn: 2 },
  { id: 'normal', order: 2, name: 'ふつう', enemyLevel: 0, lives: 3, enemyHp: 1.55, enemyAttack: 1.55, corruptionPerTurn: 2 },
  { id: 'hard', order: 3, name: 'むずかしい', enemyLevel: 1, lives: 2, enemyHp: 1.7, enemyAttack: 1.7, reward: 0.8, corruptionPerTurn: 2 },
];
