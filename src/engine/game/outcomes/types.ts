// ===== 冒険の効果（イベントの結果・戦闘の外で使うアイテム・祠の恵みなど）の決まりごと =====
import type { EventOutcome, GameState, Hero, Loot } from '../../../types';
import type { Rng } from '../../rng';

export interface OutcomeCtx {
  game: GameState;
  rng: Rng;
  /** 判定したキャラ / アイテムを使う相手 */
  actor?: Hero;
  /** 手に入れたもの（最後にまとめて持ち物へ入れる） */
  loot: Loot[];
  /** 対象（all なら生存者全員、そうでなければ actor。actor が無ければ先頭の生存者） */
  targets(all?: boolean): Hero[];
}

/** 冒険の効果1種類分。kinds/ に1ファイル1種類で置く（export const outcome = ...） */
export interface OutcomeHandler<K extends EventOutcome['kind'] = EventOutcome['kind']> {
  kind: K;
  apply(ctx: OutcomeCtx, o: Extract<EventOutcome, { kind: K }>): void;
  /** アイテムとして使えるか（使えなければ理由） */
  check?(ctx: OutcomeCtx, o: Extract<EventOutcome, { kind: K }>): string | null;
  describe(o: Extract<EventOutcome, { kind: K }>): string;
}
