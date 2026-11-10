// 難易度。冒険の準備の画面に並ぶ（order の順）
// description = 準備の画面・図鑑に出す説明（内部の倍率は見せない。フェーズ3）。命の灯火の数は lives と合わせる
// 目安（自動プレイ・4人・40回）: やさしい 約65%・ふつう 約20〜25%・むずかしい 約10〜15%。SIM=1 npx vitest run balance で確かめる
// v2.9（ダンジョンも手番の順番・探索力）で時間がかかるようになったので、侵食度は1巡ごとに+1
import type { DifficultyDef } from '../../../types';

export const difficulties: DifficultyDef[] = [
  { id: 'easy', order: 1, name: 'やさしい', description: '初めての人向け。敵が少し弱く、命の灯火×5', enemyLevel: -1, lives: 5, enemyHp: 1.2, enemyAttack: 1.2, corruptionPerTurn: 1 },
  { id: 'normal', order: 2, name: 'ふつう', description: '標準の歯ごたえ。連携とフォーカスの使い方が鍵（命の灯火×3）', enemyLevel: 0, lives: 3, enemyHp: 1.65, enemyAttack: 1.65, corruptionPerTurn: 1 },
  { id: 'hard', order: 3, name: 'むずかしい', description: '敵が強く、報酬も少ない。腕に自信のある人へ（命の灯火×2）', enemyLevel: 1, lives: 2, enemyHp: 1.7, enemyAttack: 1.7, reward: 0.8, corruptionPerTurn: 1 },
];
