// シナリオ2の世界マップのイベント（where: 'map'）。名所はイベントとして書く。残りは手順4で足す
import type { EventDef } from '../../../../types';

export const mapEvents: EventDef[] = [
  {
    id: 'songStone',
    where: 'map',
    title: '春の歌の石碑',
    icon: 'stele',
    text: '雪に埋もれかけた石碑に、古い歌が刻まれている。「雪は溶け、花は咲く。灯を絶やさぬ者のもとに」',
    options: [
      { label: '歌を読む', success: [{ kind: 'nothing' }], successText: '歌を心に刻んだ。漁村の長老に伝えよう。' },
      {
        label: '石碑の根元を調べる',
        check: { stat: 'per', slots: 3, need: 2 },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'nothing' }],
        successText: '石碑の根元に、古い金貨が埋まっていた！（歌も読んだ）',
        failText: '何も見つからなかった。（歌は読んだ）',
      },
    ],
  },
  {
    id: 'bonfireTravelers',
    where: 'map',
    title: '旅人の焚き火',
    icon: 'sparkles',
    text: '誰かが残した焚き火が、まだ小さく燃えている。吹雪の中で、ここだけが温かい。',
    options: [
      { label: '火にあたって休む（全員のHP+20）', success: [{ kind: 'heal', amount: 20, all: true }], successText: '体が芯から温まった。' },
      { label: '薪を足して、火を絶やさないようにする', success: [{ kind: 'gainFocus', amount: 2, all: true }], successText: '火を見つめていると、心が落ち着いた。（全員のフォーカス+2）' },
    ],
  },
  // 温泉（シナリオ2の作り直し §2-1・§8-2）: 地図の herbEvent で、東「巨人の尾根」に置く回復のマス（placed なので、ふつうのイベントのくじには入らない）。
  // 役割: 「HPの回復」と「次の朝まで寒さを受けない」を1か所で（野営 = 番を使ってそのターンだけ／焚き火の旅人 = 回復かフォーカス）。
  // 回復の量は、新しい数字を作らず、薬草の群生地で摘める回復薬（HP+20）と同じ【提案】
  {
    id: 'hotSpring',
    where: 'map',
    placed: true,
    title: '尾根の温泉',
    icon: 'droplet',
    text: '岩の間から湯気が立ちのぼっている。雪の中に、温かい湯が湧いていた。',
    options: [
      {
        label: '湯につかる（全員のHP+20・次の朝まで寒さを受けない）',
        success: [{ kind: 'heal', amount: 20, all: true }, { kind: 'warmth', all: true }],
        successText: '体の芯まで温まった。次の朝まで、寒さはこたえないだろう。',
      },
      { label: '先を急ぐ', success: [{ kind: 'nothing' }], successText: '湯気を背に、先へ進んだ。' },
    ],
  },
];
