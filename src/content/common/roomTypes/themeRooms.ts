// ランダムダンジョンのテーマの4行目の部屋（段階7a・overhaul-plan-v2 §4-2）。並びのデータには書かない（テーマが4行目に1部屋置く）。
// - 晶石の祭壇（古代の晶洞）: 全員が自分のカードを1枚選び、＋に強化するか、同じ格の別のカードに変異させる（選ぶのは本人。だれも待たない）
// - 闇商人（無法者の隠れ処）: 全員に、店に無い専用の装備を1つと、レア以上の品を高めの値段で見せる（買わなくてもよい）
// どちらも扉の予兆は青（未知の祭壇・行商人）。名前と説明だけを変えて出す
import type { RoomTypeDef } from '../../../types';

export const roomTypes: RoomTypeDef[] = [
  {
    id: 'crystalAltar',
    order: 5.2,
    name: '晶石の祭壇',
    icon: 'gem',
    color: '#9ae8ff',
    bg: '#0c2e3a',
    behavior: 'altar',
    omen: 'mystery',
    omenName: '晶石の祭壇',
    omenText: 'カード1枚を強化か変異',
  },
  {
    id: 'blackMarket',
    order: 5.3,
    name: '闇商人',
    icon: 'coins',
    color: '#e8c070',
    bg: '#2a1c0c',
    behavior: 'blackMarket',
    omen: 'mystery',
    omenName: '闇商人',
    omenText: '専用の装備を売る（高め）',
  },
];
