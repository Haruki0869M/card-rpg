// シナリオ4の世界マップのイベント（where: 'map'）。名所と、オアシス（暑さ寒さをしのいで休める場所）
import type { EventDef } from '../../../../types';

export const mapEvents: EventDef[] = [
  {
    id: 'sunTablet',
    where: 'map',
    title: '太陽の石板',
    icon: 'stele',
    text: '砂に半分埋もれた石板に、古い祈りが刻まれている。「太陽は王の命、月は民の眠り」',
    options: [
      { label: '祈りを読む', success: [{ kind: 'nothing' }], successText: '祈りを心に刻んだ。市場の老商人に伝えよう。' },
      {
        label: '石板の下を掘る',
        check: { stat: 'str', slots: 2, need: 1 },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'nothing' }],
        successText: '石板の下から、古い金貨が出てきた！（祈りも読んだ）（40ゴールド）',
        failText: '何も出てこなかった。（祈りは読んだ）',
      },
    ],
  },
  {
    id: 'sandOasis',
    where: 'map',
    title: '小さなオアシス',
    icon: 'spring',
    text: '岩陰に、小さな泉が湧いている。ヤシの木陰が、暑さも寒さも和らげてくれそうだ。',
    options: [
      { label: '泉の水を飲んで休む（全員のHP+25）', success: [{ kind: 'heal', amount: 25, all: true }], successText: '冷たい水が、体にしみわたった。' },
      { label: '水筒に水をくんでおく', success: [{ kind: 'item', rarity: 'common', slot: 'consumable' }], successText: 'きれいな水をくんだ。（消費アイテム）' },
    ],
  },
];
