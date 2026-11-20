// 隠しボスの名所（K3 C）: 「powerPlant」の地域の空いたマスに1つだけ置かれる（hiddenIn）。
// 最終ボス並みに強い。戦うか立ち去るかを選ぶ（どちらでも、この名所はもう使えない）
import type { EventDef } from '../../../../types';

export const hiddenBossEvents: EventDef[] = [
  {
    id: 'ancientEngineRoom',
    where: 'map',
    hiddenIn: 'powerPlant',
    title: '動力炉の奥の機関',
    icon: 'gear',
    text: '動力炉の奥に、古い機械の心臓が回っている。帝国が作られる前から、ずっと動いていたものだ。誰も止め方を知らない。',
    options: [
      {
        label: '戦う（とても強い。勝てばエピック以上の装備）',
        success: [{ kind: 'battle', enemies: [{ defId: 'ancientEngineHeart', level: 10 }], onWin: [{ kind: 'item', rarity: 'epic' }] }],
        successText: '近づくと、機関の音が大きくなった。止めに来た者を、排除するつもりだ！',
      },
      { label: '立ち去る（もう戻れない）', success: [{ kind: 'nothing' }], successText: '扉を閉めた。機関の音が、遠ざかっていく。' },
    ],
  },
];
