// シナリオ3の世界マップのイベント（where: 'map'）。名所はイベントとして書く。
// シナリオ3の作り直し 区切り2（計画 §3-1）: ふつうのイベントのくじは「流れ着いた樽（消耗品）」「難破船の残骸（装備）」「潮だまり（お供・真珠）」の3種類
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
  {
    // 難破船の残骸（計画 §3-1 → 2026-11-21 に潮に結びつけた。点検 A-1: 前はシナリオ1の「打ち捨てられた野営地」と判定もご褒美も同じだった）。
    // 役割 = 「今もぐって賭けるか、潮が引くまで待つ（時間 = 霧の濃さを払う）か」を選ぶ場所。
    // 引き潮（夕方・夜）= 判定なしで歩いて入れる／満ち潮（朝・昼）= もぐる判定（前のまま）。悪さ「潮が止まる」の間は、止まった潮のまま
    id: 'wreckDebris',
    where: 'map',
    title: '難破船の残骸',
    icon: 'sword',
    text: '浜に、難破船の残骸が打ち上げられている。傾いた船室の奥に、錆びた武具箱が見えた。潮が引いている間（夕方・夜）なら、歩いて入れそうだ。',
    options: [
      {
        label: '干上がった船室まで歩いて、武具箱を開ける（引き潮の間だけ）',
        tide: 'low',
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        successText: '潮の引いた砂の上を歩いて、船室に入った。武具箱の中に、まだ使える装備が残っていた！',
      },
      {
        label: '沈んだ船室にもぐって武具箱を探す（満ち潮の間）',
        tide: 'high',
        check: { stat: 'dex', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        fail: [{ kind: 'damage', amount: 8 }],
        successText: '武具箱の中に、まだ使える装備が残っていた！',
        failText: '腐った床が抜けて、落ちてきた梁の下敷きになった…（8ダメージ）',
      },
      { label: '外から眺めて立ち去る', success: [{ kind: 'nothing' }], successText: '崩れそうな船には近づかずに進んだ。' },
    ],
  },
  {
    // 潮だまり（計画 §3-1）: 役割 = お供が懐くか、真珠（お金）を拾う。群島の地図のイベントで、お供の物はこれだけ（突発のイルカは海の上だけ）
    id: 'tidePool',
    where: 'map',
    title: '潮だまり',
    icon: 'droplet',
    text: '岩場に、潮が引いて残った潮だまりがある。小魚と蟹が、ちょろちょろ泳いでいる。',
    options: [
      { label: 'お供と一緒に小魚を追いかける', requiresPet: true, success: [{ kind: 'petLove', amount: 8, all: true }], successText: 'お供は夢中で小魚を追いかけて、うれしそうに戻ってきた。（懐き度+8）' },
      {
        label: '岩の間を探る',
        check: { stat: 'per', slots: 3, need: 2 },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'damage', amount: 4 }],
        successText: '岩の間に、小さな真珠が光っていた！（40ゴールド）',
        failText: '蟹に指をはさまれた！（4ダメージ）',
      },
      { label: '眺めて先へ進む', success: [{ kind: 'nothing' }], successText: '潮だまりの生き物を眺めてから、先へ進んだ。' },
    ],
  },
];
