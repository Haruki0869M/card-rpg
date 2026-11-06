// 依頼の目標1種類分。objectives/ に1ファイル1種類で置く（export const objective = ...）
import type { GameState, QuestObjective } from '../../../../types';

/** 冒険の中で起きたこと（依頼の進み具合を数える） */
export type QuestSignal =
  | { kind: 'defeatWanderer'; region: number }
  | { kind: 'visitLandmark'; landmarkId: string }
  | { kind: 'clearDungeon'; dungeonId: string };

export interface ObjectiveHandler<K extends QuestObjective['kind'] = QuestObjective['kind']> {
  kind: K;
  /** 必要な数 */
  goal(o: Extract<QuestObjective, { kind: K }>): number;
  /** 起きたことで進む数（0なら進まない） */
  progress?(o: Extract<QuestObjective, { kind: K }>, s: QuestSignal): number;
  /** 報告する時に満たしているか（持ち物を渡す依頼など）。満たしていれば true */
  canReport?(game: GameState, o: Extract<QuestObjective, { kind: K }>): boolean;
  /** 報告した時（持ち物を渡す など） */
  onReport?(game: GameState, o: Extract<QuestObjective, { kind: K }>): void;
  describe(o: Extract<QuestObjective, { kind: K }>): string;
  /** 地図に出す目的地（名所・ダンジョンのID） */
  target?(o: Extract<QuestObjective, { kind: K }>): string | undefined;
}
