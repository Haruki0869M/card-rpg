// シナリオ5の世界マップのイベント（where: 'map'）。名所と、星見台（休める場所）
import type { EventDef } from '../../../../types';

export const mapEvents: EventDef[] = [
  {
    id: 'skyBell',
    where: 'map',
    title: '天空の鐘',
    icon: 'stele',
    text: '雲の上に、古い鐘が吊るされている。鐘の下に、小さな文字が刻まれている。「星が泣く夜、鐘を鳴らせ」',
    options: [
      { label: '鐘を鳴らす', success: [{ kind: 'nothing' }], successText: '澄んだ音が、空に響いた。風見の宿の主人に伝えよう。' },
      {
        label: '鐘の根元を調べる',
        check: { stat: 'per', slots: 2, need: 1 },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'nothing' }],
        successText: '鐘の根元に、古い金貨が挟まっていた！（鐘も鳴らした）（40ゴールド）',
        failText: '何も見つからなかった。（鐘は鳴らした）',
      },
    ],
  },
  {
    id: 'stargazingDeck',
    where: 'map',
    title: '星見の台',
    icon: 'sparkles',
    text: '小さな丸い台がある。寝ころべば、満天の星がすぐそばに見えそうだ。',
    options: [
      { label: '寝ころんで星を眺める（全員のHP+20）', success: [{ kind: 'heal', amount: 20, all: true }], successText: '星を眺めて、心も体も休まった。' },
      { label: '星の動きを読み解く', check: { stat: 'int', slots: 2, need: 1 }, success: [{ kind: 'gainFocus', amount: 2, all: true }], fail: [{ kind: 'nothing' }], successText: '星の巡りを読み、頭が冴えた。（全員フォーカス+2）', failText: '星が多すぎて、よく分からなかった。' },
    ],
  },
];
