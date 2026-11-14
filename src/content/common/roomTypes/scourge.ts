// 災厄の中ボスとの戦闘（段階7b・overhaul-plan-v2 §3-1）。世界マップの巣のマスで戦う（ダンジョンの部屋には置かない: layoutWeight 無し）。
// 中ボスと同じ扱い（ボス向けの効き方・カードの報酬の確率はボスと同じ）。ふつうの装備のドロップは無い（専用の装備を必ず落とすため。world/scourges.ts）。
// 逃げられる（寄り道なので。遭遇の「逃げる」と、煙玉などの道具。逃げても災厄は残る）
import type { RoomTypeDef } from '../../../types';

export const roomTypes: RoomTypeDef[] = [
  {
    id: 'scourge',
    order: 5.6,
    name: '災厄の中ボス',
    icon: 'skull',
    color: '#b46aff',
    bg: '#2a0a3a',
    behavior: 'battle',
    battle: { pool: 'midboss', levelBonus: 0, cardOdds: 'boss' },
  },
];
