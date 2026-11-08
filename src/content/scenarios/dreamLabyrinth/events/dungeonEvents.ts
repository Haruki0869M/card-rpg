// シナリオ7のダンジョンのイベント部屋。ボスの手前は、過去のボスの再来を伝える「物語の部屋」（1〜2文）
import type { EventDef } from '../../../../types';

export const dungeonEvents: EventDef[] = [
  // ----- 道中のイベント -----
  {
    id: 'dreamStairs',
    title: '終わらない階段',
    icon: 'trap',
    text: '階段を上っても上っても、同じ踊り場に戻ってくる。夢の仕掛けのようだ。',
    options: [
      {
        label: '目を閉じて、足音だけを頼りに進む',
        check: { stat: 'per', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'damage', amount: 6, all: true }],
        successText: '足音のずれに気づき、抜け出せた。踊り場の隅に金貨が落ちていた。（40ゴールド）',
        failText: '足を踏み外して、階段を転げ落ちた！（全員 6ダメージ）',
      },
      { label: '壁をたどって別の道を探す', success: [{ kind: 'nothing' }], successText: '壁をたどって、遠回りして進んだ。' },
    ],
  },
  {
    id: 'echoChest',
    title: '記憶の宝箱',
    icon: 'cart',
    text: '見覚えのある宝箱が置いてある。どこかの旅で見た箱だ。',
    options: [
      {
        label: '開け方を思い出して開ける',
        check: { stat: 'dex', slots: 3, need: 2, tag: 'obstacle' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        fail: [{ kind: 'damage', amount: 5 }],
        successText: '思い出した手順で開いた。装備が入っていた！',
        failText: '手順を間違えて、仕掛けが作動した…。',
      },
      { label: '放っておく', success: [{ kind: 'nothing' }], successText: '箱には触れずに進んだ。' },
    ],
  },
  {
    id: 'fadedMural',
    title: '色あせた壁画',
    icon: 'stele',
    text: '色あせた壁画に、六つの世界の英雄たちが描かれている。顔はもう、よく見えない。',
    options: [
      {
        label: '顔を思い出す',
        check: { stat: 'int', slots: 3, need: 2, tag: 'arcane' },
        success: [{ kind: 'exp', amount: 30 }],
        fail: [{ kind: 'status', status: 'weak', amount: 2 }],
        successText: '英雄たちの名前を思い出した。力が湧いてくる。（全員 経験値+30）',
        failText: '思い出そうとして、頭が痛くなった…。次の戦闘で弱体2。',
      },
      { label: '見なかったことにする', success: [{ kind: 'nothing' }], successText: '壁画には触れずに進んだ。' },
    ],
  },
  {
    id: 'lullabySpring',
    title: '子守歌の泉',
    icon: 'spring',
    text: '静かな泉から、やさしい歌が聞こえる。',
    options: [
      {
        label: '歌に合わせて水を飲む',
        check: { stat: 'luk', slots: 2, need: 1 },
        success: [{ kind: 'heal', amount: 25, all: true }, { kind: 'gainFocus', amount: 1, all: true }],
        fail: [{ kind: 'status', status: 'weak', amount: 2 }],
        successText: '歌が体に染みわたる！（全員 HP+25・フォーカス+1）',
        failText: '眠気に襲われて、力が抜けた…。次の戦闘で弱体2。',
      },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '泉を後にした。' },
    ],
  },
  {
    id: 'nightmareTrap',
    title: '悪夢の罠',
    icon: 'trap',
    text: '床の模様が、ゆらゆらと形を変えている。罠だろうか。',
    options: [
      {
        label: '模様の規則を見破る',
        check: { stat: 'per', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 50 }, { kind: 'item', rarity: 'common', slot: 'consumable' }],
        fail: [{ kind: 'damage', amount: 5, all: true }],
        successText: '罠を外して、奥の財宝を手に入れた！（50ゴールド）',
        failText: '悪夢の罠が作動した！（全員 5ダメージ）',
      },
      { label: '見なかったことにする', success: [{ kind: 'nothing' }], successText: '罠には触れずに進んだ。' },
    ],
  },
  {
    id: 'dreamPeddler',
    title: '夢の行商人',
    icon: 'merchant',
    text: 'ぼんやりした影の行商人が、品物を広げている。「忘れ物はありませんか？」',
    options: [
      { label: '回復薬を買う（30G）', cost: 30, success: [{ kind: 'loseGold', amount: 30 }, { kind: 'item', rarity: 'common', slot: 'consumable' }], successText: '「毎度あり」' },
      { label: '掘り出し物を買う（90G）', cost: 90, success: [{ kind: 'loseGold', amount: 90 }, { kind: 'item', rarity: 'rare', slot: 'equipment' }], successText: '「いい夢を」' },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '「また、夢でお会いしましょう」' },
    ],
  },
  // ----- ボスの手前の物語の部屋 -----
  {
    id: 'iceEchoHall',
    title: '氷の玉座の残響',
    icon: 'stele',
    text: '氷の玉座に、白の女王の影が座っている。「…また、あなたたちなのね。夢の中でも、私を止めに来た」',
    options: [
      { label: '武器を構えて進む', success: [{ kind: 'nothing' }], successText: '女王の影が立ち上がった。戦いが始まる！' },
      { label: '深呼吸して備える（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '冷たい空気の中で、心を落ち着けた。' },
    ],
  },
  {
    id: 'sandEchoHall',
    title: '黄金の玉座の残響',
    icon: 'stele',
    text: '黄金の玉座に、砂塵の王の影が座っている。「夢の中なら、民は皆、永遠に笑っていられる」',
    options: [
      { label: '王の影に近づく', success: [{ kind: 'nothing' }], successText: '王の影が砂になって立ち上がった。戦いが始まる！' },
      { label: '仲間と顔を見合わせる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '仲間と頷き合い、覚悟を決めた。' },
    ],
  },
  {
    id: 'ghostEchoHall',
    title: '艦橋の残響',
    icon: 'stele',
    text: '艦橋で、亡霊提督の影が舵を握っている。「あの日の海を、もう一度。…今度こそ、守り抜く」',
    options: [
      { label: '提督の影に語りかける', success: [{ kind: 'nothing' }], successText: '提督の影が剣を向けた。戦いが始まる！' },
      { label: '祈りを捧げる（全員のHP+15）', success: [{ kind: 'heal', amount: 15, all: true }], successText: '潮の香りが、傷を癒やした。' },
    ],
  },
  {
    id: 'dreamEaterNest',
    title: '夢喰いの巣',
    icon: 'stele',
    text: '黒い影が、無数の記憶を抱えてうずくまっている。「忘れられたくなかった。だから、全部、食べた」',
    options: [
      { label: '夢喰いに語りかける', success: [{ kind: 'nothing' }], successText: '影が、ぎゅっと記憶を抱きしめた。戦いが始まる！' },
      { label: '仲間と顔を見合わせる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '仲間と頷き合い、覚悟を決めた。' },
    ],
  },
];
