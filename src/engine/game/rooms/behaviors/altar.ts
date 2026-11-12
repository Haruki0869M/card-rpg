// 晶石の祭壇の部屋（段階7a・古代の晶洞の4行目）: その場のキャラ全員が、自分のカードを1枚選んで「＋に強化」か「同じ格の別のカードに変異」。
// 選ぶのは本人（CARD_TASK。この端末のキャラの画面に出る）。部屋はすぐ片づき、通路に戻る（だれかが選び終わるのを待たない）
import { addLog } from '../../common';
import { sceneHeroes } from '../../heroes';
import type { RoomBehavior } from '../types';

export const behavior: RoomBehavior = {
  id: 'altar',
  enter(game, room) {
    for (const h of sceneHeroes(game)) if (!h.retired && !h.cardTask && h.deck.length) h.cardTask = 'altar';
    room.cleared = true;
    game.mode = 'dungeon';
    addLog(game, '晶石の祭壇が光っている。カードを1枚ずつ、強化か変異ができる');
  },
};
