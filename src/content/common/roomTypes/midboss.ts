// 中ボスの部屋（抜本的な見直し §2-1）。最後のダンジョンの7行目に1部屋だけ置く（選べない行）。
// 敵はダンジョンの pools.midboss。レベルの加算とカードの報酬の確率はボスと同じ。逃げられない。倒しても制覇にはならない（大宝箱は無い）
import type { RoomTypeDef } from '../../../types';

export const roomTypes: RoomTypeDef[] = [
  {
    id: 'midboss',
    order: 5.5,
    name: '中ボス',
    icon: 'skull',
    color: '#d9a2ff',
    bg: '#34104a',
    behavior: 'battle',
    heavyDoor: true,
    // 装備のエピック率 30% は提案（強敵は 10%）
    battle: { pool: 'midboss', levelBonus: 2, cardOdds: 'boss', noEscape: true, equipmentDrop: { epicChance: 30 } },
  },
];
