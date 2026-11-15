// シナリオ3の世界マップのイベント（where: 'map'）。名所はイベントとして書く。残りは手順4で足す
import type { EventDef } from '../../../../types';

export const mapEvents: EventDef[] = [
  {
    id: 'tideStone',
    where: 'map',
    // 名所だけ（オーナーの決定 9・シナリオ3の作り直しの点検 C9）: 依頼の潮騒の石碑が、ふつうのイベントのくじで何個も出ないように
    placed: true,
    title: '潮騒の石碑',
    icon: 'stele',
    text: '波しぶきに濡れた石碑に、古い歌が刻まれている。「三つの灯が重なる時、霧は晴れる」',
    options: [
      { label: '歌を読む', success: [{ kind: 'nothing' }], successText: '歌を心に刻んだ。珊瑚の村の長老に伝えよう。' },
      {
        label: '石碑の根元を調べる',
        check: { stat: 'per', slots: 3, need: 2 },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'nothing' }],
        successText: '石碑の根元に、古い金貨が埋まっていた！（歌も読んだ）（40ゴールド）',
        failText: '何も見つからなかった。（歌は読んだ）',
      },
    ],
  },
  {
    id: 'driftChest',
    where: 'map',
    title: '流れ着いた樽',
    icon: 'cart',
    text: '浜辺に、古い樽が流れ着いている。中から、かすかに物音がする。',
    options: [
      { label: '樽を開ける', check: { stat: 'str', slots: 2, need: 1 }, success: [{ kind: 'item', rarity: 'rare', slot: 'consumable' }], fail: [{ kind: 'nothing' }], successText: '樽の中から、薬が出てきた！', failText: '中身は海水に浸かって、だめになっていた。' },
      { label: '放っておく', success: [{ kind: 'nothing' }], successText: '樽には触れずに進んだ。' },
    ],
  },
];
