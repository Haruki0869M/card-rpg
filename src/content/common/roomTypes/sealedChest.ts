// 封魔の宝箱の部屋（依頼の「金の扉 ＝ 宝物庫（宝箱）または 封魔の宝箱（罠・戦闘つき高レア箱）」）。
// 並びのデータには書かない: 宝箱の部屋が、ダンジョンを作る時に一定の確率（BALANCE.sealedChest）でこの種類に変わる。
// 動きは宝箱（behavior: chest）。封印を解くと罠の判定があり、番人（そのダンジョンの強敵の組）との戦闘に勝つと、高い格の箱を開けられる。
// 番人のレベルの加算は +2（強敵は +1・ボスと中ボスは +2。提案）。番人は装備を落とさない（宝箱がご褒美）。カードの確率は強敵と同じ
import type { RoomTypeDef } from '../../../types';

export const roomTypes: RoomTypeDef[] = [
  {
    id: 'sealedChest',
    order: 4.5,
    name: '封魔の宝箱',
    icon: 'gift',
    color: '#ffd76a',
    bg: '#3a1a3a',
    behavior: 'chest',
    omen: 'treasure',
    omenName: '封魔の宝箱',
    omenText: '戦闘つき高レア箱',
    sealedChest: true,
    battle: { pool: 'elite', levelBonus: 2, cardOdds: 'elite' },
  },
];
