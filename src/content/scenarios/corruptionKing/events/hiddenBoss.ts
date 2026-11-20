// 隠しボスの名所（K3 C）: 「castleRegion」の地域の空いたマスに1つだけ置かれる（hiddenIn）。
// 最終ボス並みに強い。戦うか立ち去るかを選ぶ（どちらでも、この名所はもう使えない）
import type { EventDef } from '../../../../types';

export const hiddenBossEvents: EventDef[] = [
  {
    id: 'hollowDemonShadow',
    where: 'map',
    hiddenIn: 'castleRegion',
    title: '空ろな魔王の影',
    icon: 'skull',
    text: '崩れた玉座の前に、黒い影が座っている。倒されたはずの、先代の魔王の影だ。影が顔を上げ、つぶやいた。「まだ…終わっていない」',
    options: [
      {
        label: '戦う（とても強い。勝てばエピック以上の装備）',
        success: [{ kind: 'battle', enemies: [{ defId: 'hollowDemonLord', level: 11 }], onWin: [{ kind: 'item', rarity: 'epic' }] }],
        successText: '影が立ち上がり、魔剣を抜いた！',
      },
      { label: '立ち去る（もう戻れない）', success: [{ kind: 'nothing' }], successText: '影は、静かに目を閉じた。もう、ここには戻れない。' },
    ],
  },
];
