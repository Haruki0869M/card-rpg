// 時間で消える出現スポット（段階6）で始まるイベント。where: 'spawn' なので、突発イベント・マップのイベント・ダンジョンの部屋には出ない。
// ごほうびは「寄り道が得する時もある」くらい（判定・逃げ足しだいで、大当たりにも、ふつうにもなる）。数値はすべて提案
import type { EventDef } from '../../../types';

export const spawnEvents: EventDef[] = [
  {
    id: 'spawnStar',
    where: 'spawn',
    tone: 'good',
    title: '流れ星の落下地点',
    icon: 'sparkles',
    text: '夜空から落ちた星が、地面を焦がして光っている。土の中に、星のかけらが埋まっているようだ。',
    options: [
      {
        label: 'かけらを掘り出す',
        check: { stat: 'per', slots: 3, need: 2 },
        success: [{ kind: 'item', rarity: 'epic' }],
        fail: [{ kind: 'item', rarity: 'rare', slot: 'consumable' }],
        successText: '星の力を宿した、まばゆい装備を掘り当てた！',
        failText: '小さなかけらしか見つからなかった。（レアの消費アイテム）',
      },
      { label: '星の光を浴びる', success: [{ kind: 'heal', amount: 20, all: true }, { kind: 'gainFocus', amount: 1, all: true }], successText: 'あたたかい光に包まれた。（全員HP+20・フォーカス+1）' },
    ],
  },
  {
    id: 'spawnPeddler',
    where: 'spawn',
    tone: 'shop',
    title: 'さすらいの行商人',
    icon: 'cart',
    text: '大きな荷馬車の行商人が、街道から外れた所で店を広げている。「遠い国の珍しい品だよ。すぐに次の町へ発つからね」',
    options: [
      { label: '珍しい品を見せてもらう', success: [{ kind: 'peddler', discount: 0, rarity: [2, 2] }], successText: '荷台に、町では見かけない品が並んでいる。' },
      {
        label: '値切ってみる',
        check: { stat: 'dex', slots: 3, need: 2 },
        success: [{ kind: 'peddler', discount: 25, rarity: [2, 2] }],
        fail: [{ kind: 'peddler', discount: 0, rarity: [2, 2] }],
        successText: '「お客さん、口がうまいねえ…25%引きだ」',
        failText: '「珍しい品だから、まけられないよ」値切りは失敗した。（定価のまま）',
      },
      { label: '先を急ぐ', success: [{ kind: 'nothing' }], successText: '行商人に手を振って別れた。' },
    ],
  },
  {
    id: 'spawnThief',
    where: 'spawn',
    tone: 'battle',
    title: '黄金のコソ泥',
    icon: 'coins',
    text: '金貨の袋を抱えた黄金のコソ泥が、木陰で居眠りしている！ 戦いの4ターン目には逃げ出すので、短い勝負になる。',
    options: [
      {
        label: '忍び寄って不意を打つ',
        check: { stat: 'agi', slots: 3, need: 2 },
        success: [{ kind: 'battle', enemies: [{ defId: 'goldenThief' }], surprise: true, goldMul: 3 }],
        fail: [{ kind: 'battle', enemies: [{ defId: 'goldenThief' }], goldMul: 3 }],
        successText: '気づかれずに近づけた！ 先制のチャンスだ。',
        failText: '足音で目を覚まされた！',
      },
      { label: '正面から戦う', success: [{ kind: 'battle', enemies: [{ defId: 'goldenThief' }], goldMul: 3 }], successText: '逃がすものか！' },
      { label: '見逃す', success: [{ kind: 'nothing' }], successText: 'コソ泥は目を覚まし、あっという間に見えなくなった。' },
    ],
  },
];
