// シナリオ5のダンジョンのイベント部屋。ボスの手前は「物語の部屋」（何が起きているかが分かる。1〜2文）
import type { EventDef } from '../../../../types';

export const dungeonEvents: EventDef[] = [
  // ----- 道中のイベント -----
  {
    id: 'skyWindGap',
    title: '吹き抜ける突風',
    icon: 'trap',
    text: '足元の床が途切れ、強い風が吹き上げている。向こう岸まで、跳べるだろうか。',
    options: [
      {
        label: '風に乗って跳ぶ',
        check: { stat: 'agi', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'damage', amount: 6, all: true }],
        successText: '見事に跳び越えた。向こう岸に金貨が落ちていた。（40ゴールド）',
        failText: '風に煽られて転んだ！（全員 6ダメージ）',
      },
      { label: '回り道をする', success: [{ kind: 'nothing' }], successText: '遠回りして先へ進んだ。' },
    ],
  },
  {
    id: 'starDustChest',
    title: '星屑にうずもれた箱',
    icon: 'cart',
    text: '光る星屑の山の中に、小さな箱が埋もれている。',
    options: [
      {
        label: '星屑をかき分けて取り出す',
        check: { stat: 'dex', slots: 3, need: 2, tag: 'obstacle' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        fail: [{ kind: 'damage', amount: 5 }],
        successText: '箱の中から、装備が現れた！',
        failText: '星屑の鋭い破片で、手を切ってしまった…。',
      },
      { label: '放っておく', success: [{ kind: 'nothing' }], successText: '箱には触れずに進んだ。' },
    ],
  },
  {
    id: 'constellationMural',
    title: '星座の壁画',
    icon: 'stele',
    text: '壁いっぱいに、星座が描かれている。線をたどると、何かの道筋になっているようだ。',
    options: [
      {
        label: '星座の道筋をたどる',
        check: { stat: 'int', slots: 3, need: 2, tag: 'arcane' },
        success: [{ kind: 'exp', amount: 25 }],
        fail: [{ kind: 'status', status: 'weak', amount: 2 }],
        successText: '星座は、女王が見た未来の記録だった。（全員 経験値+25）',
        failText: '星の光に目がくらんだ…。次の戦闘で弱体2。',
      },
      { label: '見なかったことにする', success: [{ kind: 'nothing' }], successText: '壁画には触れずに進んだ。' },
    ],
  },
  {
    id: 'moonPetalFountain',
    title: '月光の泉',
    icon: 'spring',
    text: '月の光を浴びた泉が、淡く光っている。',
    options: [
      {
        label: '泉の水を飲む',
        check: { stat: 'luk', slots: 2, need: 1 },
        success: [{ kind: 'heal', amount: 25, all: true }, { kind: 'gainFocus', amount: 1, all: true }],
        fail: [{ kind: 'status', status: 'weak', amount: 2 }],
        successText: '体の芯から力が湧いてくる！（全員 HP+25・フォーカス+1）',
        failText: '月の光に酔って、力が抜けた…。次の戦闘で弱体2。',
      },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '泉を後にした。' },
    ],
  },
  {
    id: 'clockworkTrap',
    title: '時計仕掛けの罠',
    icon: 'trap',
    text: '床の下から、歯車の音が聞こえる。罠が仕掛けられているようだ。',
    options: [
      {
        label: '歯車の仕掛けを見破る',
        check: { stat: 'per', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 50 }, { kind: 'item', rarity: 'common', slot: 'consumable' }],
        fail: [{ kind: 'damage', amount: 5, all: true }],
        successText: '罠を外して、奥の財宝を手に入れた！（50ゴールド）',
        failText: '罠が作動した！（全員 5ダメージ）',
      },
      { label: '見なかったことにする', success: [{ kind: 'nothing' }], successText: '罠には触れずに進んだ。' },
    ],
  },
  {
    id: 'skyPeddler',
    title: '飛行船の行商人',
    icon: 'merchant',
    text: '小さな飛行船が、ふわりと横づけされた。「こんな空の上まで、ようこそ！」',
    options: [
      { label: '回復薬を買う（30G）', cost: 30, success: [{ kind: 'loseGold', amount: 30 }, { kind: 'item', rarity: 'common', slot: 'consumable' }], successText: '「毎度あり！」' },
      { label: '掘り出し物を買う（90G）', cost: 90, success: [{ kind: 'loseGold', amount: 90 }, { kind: 'item', rarity: 'rare', slot: 'equipment' }], successText: '「いい目をしてるね！」' },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '「また、星の夜に！」' },
    ],
  },
  // ----- ボスの手前の物語の部屋 -----
  {
    id: 'windKeeperHall',
    title: '風車の間',
    icon: 'stele',
    text: '風の番人が、巨大な風車の前に立っている。「風は、星のかけらに狂わされた。…止めるなら、私を倒してくれ」',
    options: [
      { label: '武器を構えて進む', success: [{ kind: 'nothing' }], successText: '風の番人が風を巻き起こした。戦いが始まる！' },
      { label: '深呼吸して備える（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '風の音の中で、心を落ち着けた。' },
    ],
  },
  {
    id: 'librarianDesk',
    title: '司書の閲覧室',
    icon: 'stele',
    text: '星の司書が本を抱えている。「女王様は、民の未来を見たかっただけ。…私は、その手伝いをしてしまった」',
    options: [
      { label: '司書に近づく', success: [{ kind: 'nothing' }], successText: '司書の本が光りだした。戦いが始まる！' },
      { label: '本棚の本をめくる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '星の知識が、頭を冴えさせた。' },
    ],
  },
  {
    id: 'moonMaidenGarden',
    title: '月の乙女の庭',
    icon: 'stele',
    text: '月の乙女が、花に囲まれて立っている。「女王様を、お救いください。…その前に、私を」',
    options: [
      { label: '乙女に近づく', success: [{ kind: 'nothing' }], successText: '月光が刃になった。戦いが始まる！' },
      { label: '花に祈りを捧げる（全員のHP+15）', success: [{ kind: 'heal', amount: 15, all: true }], successText: '花の香りが、傷を癒やした。' },
    ],
  },
  {
    id: 'starQueenThrone',
    title: '星の玉座',
    icon: 'stele',
    text: '星読みの女王が玉座にいる。「見えるの。みんなが泣く未来が。…だから、星ごと止めてしまうわ」',
    options: [
      { label: '女王に語りかける', success: [{ kind: 'nothing' }], successText: '女王の瞳に、涙が光った。「…お願い、止めて」戦いが始まる！' },
      { label: '仲間と顔を見合わせる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '仲間と頷き合い、覚悟を決めた。' },
    ],
  },
];
