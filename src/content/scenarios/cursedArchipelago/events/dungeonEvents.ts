// シナリオ3のダンジョンのイベント部屋。ボスの手前は「物語の部屋」（何が起きているかが分かる。1〜2文）
import type { EventDef } from '../../../../types';

export const dungeonEvents: EventDef[] = [
  // ----- 道中のイベント（2026-11-16 作り直し: どれも1か所ずつ。満ちてくる潮・沈んだ宝箱 = 難破船の洞窟、隠し財産・焚き火 = 海賊の隠れ島、小舟の商人 = 沈んだ神殿、霧の中の歌声 = 嘆きの王冠号） -----
  {
    id: 'seaCaveTide',
    title: '満ちてくる潮',
    icon: 'spring',
    text: '洞窟の足元に、潮がじわじわ満ちてくる。奥へ急がなければ。',
    options: [
      {
        label: '急いで駆け抜ける',
        check: { stat: 'agi', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'damage', amount: 6, all: true }],
        successText: '潮が満ちきる前に抜けた。岩の隙間に金貨が落ちていた。（40ゴールド）',
        failText: '足を取られて、冷たい海水を浴びた！（全員 6ダメージ）',
      },
      { label: '高い岩の上で潮が引くのを待つ', success: [{ kind: 'nothing' }], successText: '潮が引くのを待って、先へ進んだ。' },
    ],
  },
  {
    id: 'sunkenChest',
    title: '沈んだ宝箱',
    icon: 'cart',
    text: '浅い水たまりの底に、錆びた宝箱が沈んでいる。',
    options: [
      {
        label: '水に潜って引き上げる',
        check: { stat: 'str', slots: 3, need: 2, tag: 'obstacle' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        fail: [{ kind: 'damage', amount: 5 }],
        successText: '宝箱を引き上げた。中から装備が出てきた！',
        failText: '重くて引き上げられず、溺れかけた…。',
      },
      { label: '放っておく', success: [{ kind: 'nothing' }], successText: '宝箱には触れずに進んだ。' },
    ],
  },
  {
    id: 'ghostSong',
    title: '霧の中の歌声',
    icon: 'mask',
    text: '霧の向こうから、悲しい歌が聞こえる。誰かが呼んでいるようだ。',
    options: [
      {
        label: '歌に耳を傾ける',
        check: { stat: 'int', slots: 3, need: 2, tag: 'arcane' },
        success: [{ kind: 'exp', amount: 25 }],
        fail: [{ kind: 'status', status: 'weak', amount: 2 }],
        successText: '歌は、百年前の婚礼の曲だった。悲しみが胸に残る。（全員 経験値+25）',
        failText: '歌に心を奪われて、力が抜けてしまった…。次の戦闘で弱体2。',
      },
      { label: '耳をふさいで進む', success: [{ kind: 'nothing' }], successText: '歌声を振り切って進んだ。' },
    ],
  },
  {
    id: 'pirateStash',
    title: '海賊の隠し財産',
    icon: 'coins',
    text: '壁の奥に、海賊の隠し部屋がある。古い罠が仕掛けられていそうだ。',
    options: [
      {
        label: '罠を調べて財宝を取る',
        check: { stat: 'per', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 50 }, { kind: 'item', rarity: 'common', slot: 'consumable' }],
        fail: [{ kind: 'damage', amount: 5, all: true }],
        successText: '罠を外して、財宝を手に入れた！（50ゴールド）',
        failText: '罠が作動した！（全員 5ダメージ）',
      },
      { label: '見なかったことにする', success: [{ kind: 'nothing' }], successText: '隠し部屋には触れずに進んだ。' },
    ],
  },
  {
    id: 'castawayCamp',
    title: '漂流者の焚き火',
    icon: 'sparkles',
    text: '誰かが焚き火を残している。流れ着いた漂流者の荷物が散らばっていた。',
    options: [
      { label: '火にあたって休む（全員のHP+20）', success: [{ kind: 'heal', amount: 20, all: true }], successText: '体が温まった。' },
      { label: '荷物を調べる', check: { stat: 'per', slots: 2, need: 1 }, success: [{ kind: 'item', rarity: 'common', slot: 'consumable' }], fail: [{ kind: 'nothing' }], successText: '荷物から、回復の品が見つかった。', failText: '荷物は潮でだめになっていた。' },
    ],
  },
  {
    id: 'seaTrader',
    title: '小舟の商人',
    icon: 'merchant',
    text: '神殿の水路に、小舟が浮かんでいる。「こんな所まで来る客は珍しいねえ」',
    options: [
      { label: '回復薬を買う（30G）', cost: 30, success: [{ kind: 'loseGold', amount: 30 }, { kind: 'item', rarity: 'common', slot: 'consumable' }], successText: '「毎度あり！」' },
      { label: '掘り出し物を買う（90G）', cost: 90, success: [{ kind: 'loseGold', amount: 90 }, { kind: 'item', rarity: 'rare', slot: 'equipment' }], successText: '「いい目をしてるね！」' },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '「また、霧の晴れた日に」' },
    ],
  },
  // ----- ボスの手前の物語の部屋 -----
  {
    id: 'serpentNest',
    title: '海蛇の巣',
    icon: 'stele',
    text: '巨大な海蛇が、洞窟の奥でとぐろを巻いている。「ここは私の海…灯台など、いらない」',
    options: [
      { label: '武器を構えて進む', success: [{ kind: 'nothing' }], successText: '海蛇の女王が鎌首をもたげた。戦いが始まる！' },
      { label: '深呼吸して備える（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '潮の匂いの中で、心を落ち着けた。' },
    ],
  },
  {
    id: 'captainCabin',
    title: '船長の部屋',
    icon: 'stele',
    text: '海賊船長ガルドが椅子に座っている。「死んでも、海は手放さん。…だが、この霧は止めたい」',
    options: [
      { label: '船長に近づく', success: [{ kind: 'nothing' }], successText: 'ガルドが剣を抜いた。戦いが始まる！' },
      { label: '船長に酒をおごる（全員のHP+15）', success: [{ kind: 'heal', amount: 15, all: true }], successText: '船長は笑い、酒を分けてくれた。' },
    ],
  },
  {
    id: 'tideAltar',
    title: '潮の祭壇',
    icon: 'stele',
    text: '潮の神官が祈っている。「提督は婚礼の船を守れず、霧に囚われた。…どうか、お救いください」',
    options: [
      { label: '神官に近づく', success: [{ kind: 'nothing' }], successText: '神官の祈りが、潮の唸りに変わった。戦いが始まる！' },
      { label: '祭壇に祈りを捧げる（全員のHP+15）', success: [{ kind: 'heal', amount: 15, all: true }], successText: '潮の光が、傷を癒やした。' },
    ],
  },
  {
    id: 'admiralBridge',
    title: '提督の艦橋',
    icon: 'stele',
    text: '亡霊提督が舵を握っている。「あの日、私は婚礼の船を沈めた。今度こそ、海を守る」',
    options: [
      { label: '提督に語りかける', success: [{ kind: 'nothing' }], successText: '提督が剣を向けた。「…止めてくれ」戦いが始まる！' },
      { label: '仲間と顔を見合わせる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '仲間と頷き合い、覚悟を決めた。' },
    ],
  },
];
