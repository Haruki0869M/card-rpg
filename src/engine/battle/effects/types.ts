// ===== 効果の部品の決まりごと =====
import type { AbilityDef, BattleEvent, BattleState, CardDef, Effect, EffectKind, EffectTarget, EffectParams } from '../../../types';
import type { Rng } from '../../rng';
import type { Unit } from '../units';

/** 効果を使う場面の情報 */
export interface EffectCtx {
  state: BattleState;
  rng: Rng;
  events: BattleEvent[];
  /** 効果を使う人 */
  source: Unit;
  /** 選んだ対象（カードの対象の敵 / アイテムを使う相手）。敵の行動ではインテントの対象を毎回読み直す */
  target?: Unit;
  /** カードから使った時のカード（全体カードなら target は相手全員） */
  card?: CardDef;
  /** このカードだけで働く特殊能力（カードの特殊能力） */
  cardAbilities?: AbilityDef[];
  /** HPに与えたダメージの合計（吸収などが読む） */
  dealt: number;
  /** 結果の短い表示（ログ・カードの結果の表示） */
  parts: string[];
  /** 効果を受けた相手のID（敵の行動の演出用） */
  hitIds: string[];
  /** 働いた常時型の能力の名前（重複なし。演出用） */
  fired: string[];
  /** 能力の連鎖の深さ（無限に続かないように） */
  depth: number;
}

/** 効果の種類1つ分の処理。src/engine/battle/effects/kinds/ に1ファイル1種類で置く（export const effect = ...） */
export interface EffectHandler<K extends EffectKind = EffectKind> {
  kind: K;
  /** to を省略した時の対象 */
  defaultTo: EffectTarget;
  /** 効果を使う。何か起きたら true（能力の発動の演出に使う） */
  apply(ctx: EffectCtx, e: Extract<Effect, { kind: K }>): boolean;
  /** 説明文（例: 「対象に6ダメージ」）。to の言い方は who に入っている */
  describe(e: Extract<Effect, { kind: K }>, who: string): string;
  /** カードの短い表示の数値（例: '6' / '全5' / '+1'）。アイコンは画面側で種類から選ぶ */
  short?(e: Extract<Effect, { kind: K }>): string;
  /** 強化（＋）した時の値 */
  upgrade?(e: Extract<Effect, { kind: K }>): Extract<Effect, { kind: K }>;
  /** アイテムとして使えるか（使えなければ理由） */
  check?(ctx: EffectCtx, e: Extract<Effect, { kind: K }>): string | null;
}

/** 強化の決まり: 25%増し（最低+1） */
export const upgradeAmount = (n: number) => n + Math.max(1, Math.ceil(n * 0.25));

/** 型の宣言用: 効果のファイルで `declare module '../../../../types' { interface EffectParams { 種類: {...} } }` と書く */
export type { EffectParams };
