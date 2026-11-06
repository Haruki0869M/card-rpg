// 成長ボーナス（レベルアップで選ぶもの）1種類分。kinds/ に1ファイル1種類で置く（export const growth = ...）
import type { GameState, GrowthOption, Hero } from '../../../types';

export interface GrowthHandler {
  kind: string;
  /** 候補として出せるか（例: 強化できるカードがある） */
  available?(hero: Hero): boolean;
  /** 候補を作る（能力値の種類などは呼ぶ側が決める） */
  make(hero: Hero): GrowthOption;
  /** 選んだ時。失敗なら理由を返す */
  apply(game: GameState, hero: Hero, o: GrowthOption, cardUid?: string): string | undefined;
  /** 画面の見出しと説明 */
  title(o: GrowthOption): string;
  text: string;
  /** 画面のアイコンの種類 */
  icon: string;
}
