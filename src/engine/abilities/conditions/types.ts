// ===== 発動の条件の決まりごと =====
import type { AbilityCondition, BattleState, CardDef } from '../../../types';
import type { Rng } from '../../rng';
import type { Unit } from '../../battle/units';

export interface CondCtx {
  state?: BattleState;
  /** 確率の条件だけが使う（常時型の能力では使えない） */
  rng?: Rng;
  /** 能力の持ち主 */
  self: Unit;
  card?: CardDef;
  target?: Unit;
  /** HPに与えたダメージ（カードを使った後など） */
  dealt?: number;
  /** 今のカードが完全成功か（ダメージの計算の時） */
  perfect?: boolean;
  /** 今のカードで使ったフォーカス */
  focusUsed?: number;
  successes?: number;
  /** きっかけになった状態異常（状態異常を与えた時・敵が継続ダメージを受けた時） */
  statusId?: string;
  supportedOthers?: boolean;
  /** 今のカードの「×N回」の攻撃（total = 当てた回数 / landed = HPに当たった回数） */
  multi?: { total: number; landed: number };
}

/** 条件の種類1つ分。src/engine/abilities/conditions/ に1ファイル1種類で置く（export const condition = ...） */
export interface ConditionHandler<K extends AbilityCondition['kind'] = AbilityCondition['kind']> {
  kind: K;
  test(c: CondCtx, cond: Extract<AbilityCondition, { kind: K }>): boolean;
  /** 説明文の一部（例: 「物理カード」「HPが50%以下の間」） */
  describe(cond: Extract<AbilityCondition, { kind: K }>): string;
  /** 乱数を使う条件か（常時型の能力には使えない） */
  random?: boolean;
}
