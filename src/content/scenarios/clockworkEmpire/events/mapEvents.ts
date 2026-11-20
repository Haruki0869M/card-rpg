// シナリオ6の世界マップのイベント（where: 'map'）。名所と、冷却水の水場（蒸気の暑さから休める場所）
import type { EventDef } from '../../../../types';

export const mapEvents: EventDef[] = [
  {
    id: 'oldBlueprint',
    where: 'map',
    title: '古い設計図',
    icon: 'stele',
    text: '錆びた金属板に、大機械の設計図が刻まれている。中心に「心臓」と書かれ、三つの核が線でつながっている。',
    options: [
      { label: '設計図を読む', success: [{ kind: 'nothing' }], successText: '三つの動力核を壊せば、心臓が止まると分かった。市場の老職人に伝えよう。' },
      {
        label: '金属板の裏を調べる',
        check: { stat: 'per', slots: 2, need: 1 },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'nothing' }],
        successText: '金属板の裏に、古い金貨が隠してあった！（設計図も読んだ）（40ゴールド）',
        failText: '何も見つからなかった。（設計図は読んだ）',
      },
    ],
  },
  {
    id: 'coolantPool',
    where: 'map',
    title: '冷却水の水場',
    icon: 'spring',
    text: '壊れた配管から、冷たい水が溜まりになって湧いている。蒸気の熱を、しばし忘れられそうだ。',
    options: [
      { label: '冷たい水を浴びて休む（全員のHP+25）', success: [{ kind: 'heal', amount: 25, all: true }], successText: '熱が引いて、体が楽になった。' },
      { label: '水筒に水をくんでおく', success: [{ kind: 'item', rarity: 'common', slot: 'consumable' }], successText: '冷たい水をくんだ。（消費アイテム）' },
    ],
  },
];
