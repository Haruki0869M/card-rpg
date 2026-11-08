// シナリオ7の世界マップのイベント（where: 'map'）。名所と、休める場所
import type { EventDef } from '../../../../types';

export const mapEvents: EventDef[] = [
  {
    id: 'dreamFountain',
    where: 'map',
    title: '記憶の泉',
    icon: 'spring',
    text: '泉をのぞくと、水面に見覚えのある景色が映る。雪の城、砂の王宮、霧の海、星の城、歯車の街、そして、魔王の城。',
    options: [
      { label: '水面を見つめる', success: [{ kind: 'nothing' }], successText: '六つの旅の思い出が、胸によみがえった。市場の古老に伝えよう。' },
      {
        label: '泉の底を探る',
        check: { stat: 'per', slots: 2, need: 1 },
        success: [{ kind: 'gold', amount: 50 }],
        fail: [{ kind: 'nothing' }],
        successText: '泉の底に、古い金貨が沈んでいた！（景色も見た）（50ゴールド）',
        failText: '何も見つからなかった。（景色は見た）',
      },
    ],
  },
  {
    id: 'dreamBench',
    where: 'map',
    title: '夢のベンチ',
    icon: 'sparkles',
    text: 'ふかふかの小さなベンチがある。座ると、不思議と眠くなる。',
    options: [
      { label: '少しだけ眠る（全員のHP+25）', success: [{ kind: 'heal', amount: 25, all: true }], successText: 'ぐっすり眠れた。夢の中の旅人たちが、手を振っていた。' },
      { label: '眠らずに景色を眺める', check: { stat: 'int', slots: 2, need: 1 }, success: [{ kind: 'gainFocus', amount: 2, all: true }], fail: [{ kind: 'nothing' }], successText: '景色の中に、道の手がかりが見えた。（全員フォーカス+2）', failText: '景色が混ざり合って、よく分からなかった。' },
    ],
  },
];
