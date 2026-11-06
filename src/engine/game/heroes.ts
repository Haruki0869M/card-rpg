// 冒険中のキャラを探す小さな道具（循環参照を避けるため game.ts から分けている）
import type { GameState } from '../../types';

export const findHero = (game: GameState, id: string) => game.heroes.find((h) => h.id === id);
/** 生きていて冒険に残っているキャラ */
export const livingHeroes = (game: GameState) => game.heroes.filter((h) => h.hp > 0 && !h.retired);
/** 冒険から退場していないキャラ（戦闘不能でも含む） */
export const activeHeroes = (game: GameState) => game.heroes.filter((h) => !h.retired);
/** 今の場面（ダンジョン・遭遇の戦闘）に参加している、生きているキャラ。参加者の指定が無ければ全員 */
export const sceneHeroes = (game: GameState) => livingHeroes(game).filter((h) => !game.party || game.party.includes(h.id));
