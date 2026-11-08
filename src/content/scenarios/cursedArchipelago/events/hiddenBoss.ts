// 隠しボスの名所（K3 C）: 「mistSea」の地域の空いたマスに1つだけ置かれる（hiddenIn）。
// 最終ボス並みに強い。戦うか立ち去るかを選ぶ（どちらでも、この名所はもう使えない）
import type { EventDef } from '../../../../types';

export const hiddenBossEvents: EventDef[] = [
  {
    id: 'drownedBrideVeil',
    where: 'map',
    hiddenIn: 'mistSea',
    title: '霧の中の花嫁',
    icon: 'ship',
    text: '霧の中に、沈みかけた婚礼の船が浮かんでいる。甲板で、白いヴェールの花嫁が海を見つめている。「あの人は、まだ迎えに来ないの」',
    options: [
      {
        label: '戦う（とても強い。勝てばエピック以上の装備）',
        success: [{ kind: 'battle', enemies: [{ defId: 'drownedBride', level: 9 }], onWin: [{ kind: 'item', rarity: 'epic' }] }],
        successText: '花嫁が振り向いた。その目は、涙ではなく海の水で濡れていた！',
      },
      { label: '立ち去る（もう戻れない）', success: [{ kind: 'nothing' }], successText: '船は霧に溶けて消えた。もう、見つけられないだろう。' },
    ],
  },
];
