// シナリオ6のダンジョンのイベント部屋。罠と仕掛けの判定が多い。ボスの手前は「物語の部屋」（1〜2文）
import type { EventDef } from '../../../../types';

export const dungeonEvents: EventDef[] = [
  // ----- 道中のイベント -----
  {
    id: 'gearConveyor',
    title: '動くベルトコンベア',
    icon: 'trap',
    text: '床いっぱいのベルトコンベアが、奥へ奥へと動いている。落ちれば、歯車に巻き込まれそうだ。',
    options: [
      {
        label: 'タイミングを見て駆け抜ける',
        check: { stat: 'agi', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'damage', amount: 6, all: true }],
        successText: '無事に渡りきった。ベルトの端に、部品の入った袋があった。（40ゴールド）',
        failText: 'ベルトに足を取られ、転がされた！（全員 6ダメージ）',
      },
      { label: '壁伝いに回り込む', success: [{ kind: 'nothing' }], successText: '壁伝いに、遠回りして渡った。' },
    ],
  },
  {
    id: 'pressTrap',
    title: 'プレス機の罠',
    icon: 'trap',
    text: '通路の床と天井に、巨大なプレス機が並んでいる。規則正しく、上下に動いている。',
    options: [
      {
        label: '動きを見切って通り抜ける',
        check: { stat: 'per', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 50 }, { kind: 'item', rarity: 'common', slot: 'consumable' }],
        fail: [{ kind: 'damage', amount: 5, all: true }],
        successText: '見事に抜けた。奥の財宝を手に入れた！（50ゴールド）',
        failText: 'プレス機に挟まれかけた！（全員 5ダメージ）',
      },
      { label: '機械を止めるスイッチを探す', check: { stat: 'dex', slots: 2, need: 1, purpose: 'mechanism' }, success: [{ kind: 'nothing' }], fail: [{ kind: 'damage', amount: 4, all: true }], successText: 'スイッチを見つけて、安全に通れた。', failText: '配線を間違えた！（全員 4ダメージ）' },
    ],
  },
  {
    id: 'steamValve',
    title: '蒸気のバルブ',
    icon: 'trap',
    text: '壊れた配管から、蒸気が噴き出している。バルブを回せば止まりそうだ。',
    options: [
      {
        label: '力を込めてバルブを回す',
        check: { stat: 'str', slots: 3, need: 2, tag: 'obstacle' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        fail: [{ kind: 'damage', amount: 5 }],
        successText: '蒸気が止まり、奥の箱が開いた！装備が入っていた。',
        failText: '熱い蒸気を浴びてしまった…。',
      },
      { label: '放っておく', success: [{ kind: 'nothing' }], successText: 'バルブには触れずに進んだ。' },
    ],
  },
  {
    id: 'coolantTank',
    title: '冷却水のタンク',
    icon: 'spring',
    text: '壊れたタンクから、冷却水が漏れている。',
    options: [
      {
        label: '冷却水を飲む',
        check: { stat: 'luk', slots: 2, need: 1 },
        success: [{ kind: 'heal', amount: 25, all: true }, { kind: 'gainFocus', amount: 1, all: true }],
        fail: [{ kind: 'status', status: 'poison', amount: 3 }],
        successText: '体の熱が引いて、頭が冴えた！（全員 HP+25・フォーカス+1）',
        failText: '冷却水に薬品が混ざっていた…。次の戦闘で毒3。',
      },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: 'タンクを後にした。' },
    ],
  },
  {
    id: 'scrapChest',
    title: 'スクラップに埋もれた箱',
    icon: 'cart',
    text: 'スクラップの山の中に、頑丈な箱が埋もれている。',
    options: [
      {
        label: 'スクラップをどかして開ける',
        check: { stat: 'str', slots: 3, need: 2, tag: 'obstacle' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'accessory' }],
        fail: [{ kind: 'damage', amount: 5 }],
        successText: '箱の中から、装飾品が出てきた！',
        failText: 'スクラップが崩れて、手を痛めた…。',
      },
      { label: '放っておく', success: [{ kind: 'nothing' }], successText: '箱には触れずに進んだ。' },
    ],
  },
  {
    id: 'peddlerBot',
    title: '行商ロボット',
    icon: 'merchant',
    text: '小さなロボットが、ガチャガチャと近づいてきた。「イラッシャイマセ。ブヒン、ウッテマス」',
    options: [
      { label: '回復薬を買う（30G）', cost: 30, success: [{ kind: 'loseGold', amount: 30 }, { kind: 'item', rarity: 'common', slot: 'consumable' }], successText: '「マイドアリ」' },
      { label: '掘り出し物を買う（90G）', cost: 90, success: [{ kind: 'loseGold', amount: 90 }, { kind: 'item', rarity: 'rare', slot: 'equipment' }], successText: '「ウレシイ」' },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '「マタ、ドウゾ」' },
    ],
  },
  // ----- ボスの手前の物語の部屋 -----
  {
    id: 'foremanOffice',
    title: '工場長の詰所',
    icon: 'stele',
    text: '工場長ゴーレムが、命令を繰り返している。「作れ。作れ。大機械のために。…なぜ、作るのだったか」',
    options: [
      { label: '武器を構えて進む', success: [{ kind: 'nothing' }], successText: '工場長が動き出した。戦いが始まる！' },
      { label: '深呼吸して備える（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '機械の音の中で、心を落ち着けた。' },
    ],
  },
  {
    id: 'boilerRoom',
    title: 'ボイラー室',
    icon: 'stele',
    text: '暴走ボイラーが、赤く脈打っている。「止まれない。止まれない。主の命令が、頭の中で鳴りやまない」',
    options: [
      { label: 'ボイラーに近づく', success: [{ kind: 'nothing' }], successText: 'ボイラーが蒸気を吹き上げた。戦いが始まる！' },
      { label: '配管の水で体を冷やす（全員のHP+15）', success: [{ kind: 'heal', amount: 15, all: true }], successText: '冷たい水が、熱を奪った。' },
    ],
  },
  {
    id: 'sageStudy',
    title: '賢者の書斎',
    icon: 'stele',
    text: '時計仕掛けの賢者が、時を刻んでいる。「大機械は、民を救うために狂った。…止める前に、その理由を知ってほしい」',
    options: [
      { label: '賢者に近づく', success: [{ kind: 'nothing' }], successText: '賢者の時計が逆回りを始めた。戦いが始まる！' },
      { label: '書斎の本をめくる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '古い機械の知識が、頭を冴えさせた。' },
    ],
  },
  {
    id: 'machineHeartRoom',
    title: '大機械の心臓',
    icon: 'stele',
    text: '巨大な心臓が、ゆっくりと脈打っている。「人は、すぐ死ぬ。だから、私が繋ぐ。…それが、なぜ悪いのか」',
    options: [
      { label: '大機械に語りかける', success: [{ kind: 'nothing' }], successText: '心臓の光が、一瞬だけ揺らいだ。戦いが始まる！' },
      { label: '仲間と顔を見合わせる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '仲間と頷き合い、覚悟を決めた。' },
    ],
  },
];
