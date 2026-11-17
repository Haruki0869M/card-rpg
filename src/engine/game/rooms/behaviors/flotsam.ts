// 漂流物の山の部屋（2026-11-16 シナリオ3の作り直し・漂流物の洞の4行目）: その場のキャラ全員に、それぞれ消耗品の候補を3つ配る（engine/game/flotsam.ts）。
// 選ぶのは本人（FLOTSAM_PICK。この端末のキャラの画面に出る）。部屋はすぐ片づき、通路に戻る（だれかが選び終わるのを待たない。晶石の祭壇と同じ形）
import { addLog } from '../../common';
import { dealFlotsam } from '../../flotsam';
import type { RoomBehavior } from '../types';

export const behavior: RoomBehavior = {
  id: 'flotsam',
  enter(game, room, rng) {
    dealFlotsam(game, rng);
    room.cleared = true;
    game.mode = 'dungeon';
    addLog(game, '🛶流れ着いた品が山になっている。1人1つずつ、好きな品を持ち帰れる');
  },
};
