// 冒険中のキャラを探す小さな道具（循環参照を避けるため game.ts から分けている）
import type { GameState } from '../../types';

export const findHero = (game: GameState, id: string) => game.heroes.find((h) => h.id === id);
export const livingHeroes = (game: GameState) => game.heroes.filter((h) => h.hp > 0);
