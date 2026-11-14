// 闇商人の部屋（段階7a・無法者の隠れ処の4行目）: その場のキャラ全員に、店に無い専用の装備1つと、レア以上の品を高めの値段で見せる。
// 買い物は本人がする（PEDDLER_BUY。行商人と同じ画面）。買わなくてもよい。部屋はすぐ片づき、通路に戻る（だれも待たない）
import { addLog } from '../../common';
import { sceneHeroes } from '../../heroes';
import { blackMarketStock } from '../../loot';
import { dungeonTheme } from '../../dungeon';
import type { RoomBehavior } from '../types';

export const behavior: RoomBehavior = {
  id: 'blackMarket',
  enter(game, room, rng) {
    // 無法者の隠れ処（2026-11-14 寄り道の値打ち）: 専用の装備を2つ並べ、1つ選んで買える（テーマの blackMarketChoices）
    const choices = dungeonTheme(game.dungeon?.theme)?.reward?.blackMarketChoices ?? 1;
    for (const h of sceneHeroes(game)) if (!h.retired) h.peddler = blackMarketStock(game, h, rng, choices);
    room.cleared = true;
    game.mode = 'dungeon';
    addLog(game, '闇商人が、店には無い品を広げた（買わなくてもよい）');
  },
};
