// 隠しボスの名所（K3 C）: 「starHill」の地域の空いたマスに1つだけ置かれる（hiddenIn）。
// 最終ボス並みに強い。戦うか立ち去るかを選ぶ（どちらでも、この名所はもう使えない）
import type { EventDef } from '../../../../types';

export const hiddenBossEvents: EventDef[] = [
  {
    id: 'fallenStarNest',
    where: 'map',
    hiddenIn: 'starHill',
    title: '丘の上の落ち星',
    icon: 'sparkles',
    text: '丘の上に、夜空から落ちた星のかけらが積もっている。かけらは、竜の形に固まって眠っている。触れると、星の光で目を覚ましそうだ。',
    options: [
      {
        label: '戦う（とても強い。勝てばエピック以上の装備）',
        success: [{ kind: 'battle', enemies: [{ defId: 'fallenStarSerpent', level: 8 }], onWin: [{ kind: 'item', rarity: 'epic' }] }],
        successText: '星の光があふれ、竜が目を覚ました！',
      },
      { label: '立ち去る（もう戻れない）', success: [{ kind: 'nothing' }], successText: 'そっと離れた。竜は、星のかけらに戻って崩れていった。' },
    ],
  },
];
