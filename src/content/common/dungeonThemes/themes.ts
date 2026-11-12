// ランダムダンジョンのテーマ（段階7a・overhaul-plan-v2 §4-2）。部屋の並びとご褒美だけを変える。
// 敵は、そのシナリオのランダムダンジョンの敵をそのまま使う（7本 × 3テーマを、敵のデータを増やさずに作る）。
// 割合（weights）と封魔の宝箱の確率は【提案】（計画は「多い・少なめ」とだけ書いている）。ご褒美の倍率と敵のLv+1は計画の数字のまま
import type { DungeonThemeDef } from '../../../types';

export const dungeonThemes: DungeonThemeDef[] = [
  {
    id: 'crystalGrotto',
    order: 1,
    name: '古代の晶洞',
    mark: '💎',
    description: 'イベントと宝箱が多く、戦闘は少なめ。宝箱のお金+50%。奥に晶石の祭壇',
    weights: { battle: 22, elite: 8, event: 30, chest: 30, rest: 10 },
    fixedRoom: 'crystalAltar',
    reward: { chestGold: 1.5 },
  },
  {
    id: 'sealedLabyrinth',
    order: 2,
    name: '封魔の地下迷宮',
    mark: '⛓',
    description: '強敵と封魔の宝箱が多い。敵のLv+1。カードと装備のエピックが出やすい（2倍）。奥に休憩が1つだけ',
    // 休憩は4行目の1部屋だけ（2〜3行目には出さない）
    weights: { battle: 30, elite: 30, event: 10, chest: 30 },
    fixedRoom: 'rest',
    enemyLevel: 1,
    sealedChance: 60,
    reward: { epicMul: 2 },
  },
  {
    id: 'outlawDen',
    order: 3,
    name: '無法者の隠れ処',
    mark: '🗡',
    description: '戦闘が多く、敵は数が多い組。戦闘のお金+30%。奥に闇商人（専用の装備を売る）',
    weights: { battle: 50, elite: 16, event: 12, chest: 12, rest: 10 },
    fixedRoom: 'blackMarket',
    largeGroups: true,
    reward: { battleGold: 1.3 },
  },
];
