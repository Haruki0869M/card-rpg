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
  // 氷漬けの箱（氷漬けの宝物庫。2026-11-14 シナリオ2の作り直し）: 動きは宝箱。箱の格は、部屋に入った時の凍えで決まる（engine/game/dungeonChill.ts）。
  // 並びのデータには書かない（テーマが4行目に1部屋置く）。扉の予兆は金（宝）
  {
    id: 'frozenChest',
    order: 5.4,
    name: '氷漬けの箱',
    icon: 'gift',
    color: '#bfe8ff',
    bg: '#0c2a3a',
    behavior: 'chest',
    omen: 'treasure',
    omenName: '氷漬けの箱',
    omenText: '凍えているほど良い箱',
  },
  // 漂流物の山（漂流物の洞。2026-11-16 シナリオ3の作り直し・計画 §3-3 と点検 B4）: 全員が、それぞれ消耗品を3つから1つ選ぶ（engine/game/flotsam.ts）。
  // 並びのデータには書かない（テーマが4行目に1部屋置く）。扉の予兆は金（宝）なので、3行目に宝箱は出ない（今の偏り防止の決まりのまま）
  {
    id: 'flotsamPile',
    order: 5.5,
    name: '漂流物の山',
    icon: 'gift',
    color: '#9fe0c8',
    bg: '#0c2a26',
    behavior: 'flotsam',
    omen: 'treasure',
    omenName: '漂流物の山',
    omenText: '全員が消耗品を3つから1つ',
  },
];
