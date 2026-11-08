// シナリオ7「夢幻の大迷宮」（総集編）。他の6本の世界の記憶が混ざった夢の迷宮。過去の敵が「夢の形」で蘇る
// 遊びの違い: 6つの世界の景色が一つの地図にある（雪・砂漠・蒸気で暑さ寒さ）。ボスは過去のボスの再来
import type { ScenarioDef } from '../../../types';
import { dreamLabyrinthMap } from './map';

export const dreamLabyrinth: ScenarioDef = {
  id: 'dreamLabyrinth',
  order: 7,
  name: '夢幻の大迷宮',
  synopsis: '六つの世界の記憶が混ざった、夢の迷宮。蘇った過去の悪を越え、三つの夢の欠片を集めて、夢喰いを止めよ。',
  recommended: '2〜4人',
  playTime: '60〜90分',
  unlocked: false,
  // 作成中: 敵・数値がそろうまで遊べない。仕上げる時に wip を消し、unlockText を「他の6本をすべてクリアすると遊べる」にする
  wip: true,
  unlockText: '準備中（もうすぐ遊べます）',
  unlockRequires: { cleared: ['corruptionKing', 'frozenKingdom', 'cursedArchipelago', 'sandDynasty', 'starCastle', 'clockworkEmpire'] },
  // 世界の悪化の名前（画面の「侵食度」の代わりに出る言葉）
  corruptionName: '夢の崩れ',
  start: { gold: 60, pouch: [{ itemId: 'potion', count: 3 }] },
  map: dreamLabyrinthMap,
  story: {
    opening: [
      '眠りの国、ドリームランド。六つの世界を渡り歩いた英雄たちの記憶が、夢の迷宮に集まっている。',
      'だが、迷宮の主「夢喰い」が、記憶を呑み、過去の悪を蘇らせはじめた。',
      '目覚めの宿の夢守りは告げた。「三つの夢の欠片を集め、夢喰いの巣へ。あなたたちの記憶が、道しるべです」',
      '夢の崩れが100%に達すれば、全ての世界の記憶が消える。夢の旅が始まる。',
    ],
    ending: [
      '夢喰いの影が、光の粒になってほどけていく。',
      '夢喰いは、忘れられた記憶が寂しさで生んだ、小さな夢だった。',
      '「…覚えていてくれて、ありがとう」',
      '六つの世界の記憶が、静かに朝の光に溶けていく。',
      '― 夢幻の大迷宮 完 ―',
    ],
    keys: { shardMemory: '夢の欠片（記憶）', shardFear: '夢の欠片（恐れ）', shardHope: '夢の欠片（希望）' },
  },
};
