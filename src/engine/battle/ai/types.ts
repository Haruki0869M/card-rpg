// ===== 敵の行動の決め方（AI）の決まりごと =====
import type { BattleState, EnemyActionDef, EnemyState } from '../../../types';
import type { Rng } from '../../rng';

export interface ActionSet {
  actions: EnemyActionDef[];
  maxConsecutive?: number;
  firstActionId?: string;
}

/** 行動の決め方1種類分。ai/ に1ファイル1種類で置く（export const ai = ...）。敵のデータの pattern で選ぶ */
export interface EnemyAiHandler {
  id: string;
  /** 次の行動を選ぶ（単独時の代替 resolve を通した行動を返す） */
  choose(enemy: EnemyState, state: BattleState, rng: Rng, set: ActionSet, resolve: (a: EnemyActionDef) => EnemyActionDef): EnemyActionDef;
}
