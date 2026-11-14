// ===== 効果の部品の決まりごと =====
import type { AbilityDef, AbilityNotice, BattleEvent, BattleState, CardDef, Effect, EffectKind, EffectTarget, EffectParams, EnemyState } from '../../../types';
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
  allyTarget?: Unit;
  /** 「ダメージを受けた時」のきっかけで、攻撃してきた相手（反撃の部品が使う。継続ダメージなどでは無い） */
  attacker?: Unit;
  /** カードから使った時のカード（全体カードなら target は相手全員） */
  card?: CardDef;
  /** このカードだけで働く特殊能力（カードの特殊能力） */
  cardAbilities?: AbilityDef[];
  /** カードが完全成功した（属性の状態異常は必ず付く） */
  perfect?: boolean;
  tierEffects?: Effect[];
  /** カードではない攻撃の出どころ（pet = お供の能力 / summon = 砲台・罠・召喚。追い込み） */
  via?: 'pet' | 'summon';
  /** 分身の追撃（召喚の攻撃。かばう敵に逸らされない） */
  echo?: boolean;
  /** 今のカードが弱点を突いた敵（効果の対象 weakHit） */
  weakTarget?: Unit;
  /** 今のカードで支援が成立した味方（効果の対象 helped） */
  helped?: Unit[];
  /** この効果のまとまりで、弱点の属性で攻撃した敵のID */
  weakHitIds?: string[];
  /** 属性の状態異常を付けない一撃（災厄の加護「鐘の響き」の響き。区切り3a）。ダメージだけ */
  noStatus?: boolean;
  /** 鎧通し（敵の盾砕き・氷の剣士。2026-11-14）: このダメージはブロックを無視する（damage の効果の pierce が、当てる間だけ立てる） */
  pierce?: boolean;
  /** 「最初の1回の攻撃にだけ足すダメージ」を、もう使った */
  addOnceUsed?: boolean;
  /** HPに与えたダメージの合計（吸収などが読む） */
  dealt: number;
  /** きっかけになった状態異常（段階7b: 自分に付いた悪い状態異常をうつす。悪夢の毛皮） */
  statusId?: string;
  /** 結果の短い表示（ログ・カードの結果の表示） */
  parts: string[];
  /** 効果を受けた相手のID（敵の行動の演出用） */
  hitIds: string[];
  /** 「×N回」の攻撃の数え（total = 当てた回数 / landed = HPに当たった回数。二の矢） */
  multi?: { total: number; landed: number };
  /** 区切りD: このカードで連携が起きた・挟撃の陣のブロックをもらった・カードの成功の数 */
  comboLanded?: boolean;
  successes?: number;
  /**
   * つまみの測定2（2026-11-13・測るだけ）: カードを使った時の、使ったフォーカス・その味方が敵の弱点を突けるカードを持っているか。
   * BREAK の決まり（BALANCE.breakPerfectHeavy・breakPerfectNoWeakCard）だけが読む。既定の値では読まない
   */
  focusUsed?: number;
  hasWeakCard?: (enemy: EnemyState) => boolean;
  /** 働いた常時型の能力の名前（重複なし。演出用） */
  fired: AbilityNotice[];
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

/** 同じ効果内の連撃では発動表示を重複させない。 */
export function recordActivation(ctx: EffectCtx, notice: AbilityNotice) {
  if (!ctx.fired.some(n => n.name === notice.name)) ctx.fired.push(notice);
}
