// 災厄の中ボス4種類（段階7b・overhaul-plan-v2 §3-2 の表のとおり。悪さ・報酬の数字は計画の【提案】のまま）。
// 専用の装備は、計画の表の後でオーナーが OK した一覧（docs/tasks/lineup-final-gear.md の「新しい（災厄）」）の物。
// 計画の表の装備（盗賊王の金貨袋・瘴気喰らいの〇〇・ブロックを持ち越す悪夢の毛皮・氷嵐の耳飾り）は、一覧で置き換えられている
// （耳飾りは段階7a で黄金箱へ移した）。業火の魔人（一覧で足された5種類目）は計画 §3 に無いので作っていない（報告に理由と案）
import type { ScourgeDef } from '../../../types';

export const scourges: ScourgeDef[] = [
  {
    id: 'greedKing',
    order: 1,
    name: '強欲の盗賊王',
    short: '盗賊王',
    boss: 'scourgeGreedKing',
    minions: ['banditThug', 'banditArcher', 'banditThug'],
    curse: { shopPrice: 25 },
    curseShort: '店+25%',
    curseText: 'すべての町の店の値段が25%高い（売る値段は変わらない）',
    reward: { gold: 300 },
    gear: 'greedCrown',
    appearText: '盗賊王の手下が町の商いを荒らしはじめた。',
    clearText: '店の値段が元に戻った。',
  },
  {
    id: 'miasmaNecro',
    order: 2,
    name: '瘴気を紡ぐ死霊術師',
    short: '死霊術師',
    boss: 'scourgeMiasmaNecro',
    minions: ['bogGhoul', 'shambler', 'bogGhoul'],
    // オーナーの決定 2-A: 世界マップの番だけ（ダンジョンの中の番には掛けない）。倒すと −5%
    curse: { corruptionPerTurn: 0.5 },
    curseShort: '侵食+0.5%',
    curseText: '世界マップの番ごとに、侵食度がさらに0.5%上がる（ダンジョンの中の番には掛からない）',
    reward: { corruption: 5 },
    gear: 'soulReaperScythe',
    appearText: '瘴気が大地にしみ出し、侵食が速まっていく。',
    clearText: '瘴気が晴れ、侵食の速さが元に戻った。',
  },
  {
    id: 'nightmareBeast',
    order: 3,
    name: '悪夢の魔獣',
    short: '魔獣',
    boss: 'scourgeNightmareBeast',
    minions: ['forestWolf', 'nightmareMote', 'forestWolf'],
    curse: { campHeal: 0.5 },
    curseShort: '野営 半分',
    curseText: '野営で回復するHPが半分になる（フォーカスは変わらない）',
    reward: { elixir: 1 },
    gear: 'nightmarePelt',
    appearText: '夜ごとに悪夢がしのび寄り、だれもぐっすり眠れない。',
    clearText: '悪夢が消え、野営でぐっすり眠れるようになった。',
  },
  {
    id: 'stormWitch',
    order: 4,
    name: '氷嵐の魔女',
    short: '魔女',
    boss: 'scourgeStormWitch',
    minions: ['frostWolf', 'iceBat', 'frostWolf'],
    curse: { nightLevel: 1 },
    curseShort: '夜 敵Lv+1',
    curseText: '夜に出る魔物のレベルが、さらに1上がる（夜の魔物は合わせて+2）',
    reward: { elixir: 1 },
    gear: 'permafrostGown',
    appearText: '夜の吹雪が魔物を荒ぶらせている。',
    clearText: '吹雪がやみ、夜の魔物が元の強さに戻った。',
  },
];
