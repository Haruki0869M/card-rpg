// シナリオ4のダンジョンのイベント部屋。ボスの手前は「物語の部屋」（何が起きているかが分かる。1〜2文）
import type { EventDef } from '../../../../types';

export const dungeonEvents: EventDef[] = [
  // ----- 道中のイベント -----
  {
    id: 'sandCollapse',
    title: '崩れる砂の床',
    icon: 'trap',
    text: '床の砂が、ざらざらと流れはじめた。このままでは、地下に呑まれてしまう。',
    options: [
      {
        label: '急いで走り抜ける',
        check: { stat: 'agi', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 40 }],
        fail: [{ kind: 'damage', amount: 6, all: true }],
        successText: '間一髪で抜けた。砂の中から金貨が見えた。（40ゴールド）',
        failText: '砂に足を取られて転んだ！（全員 6ダメージ）',
      },
      { label: '壁伝いに慎重に進む', success: [{ kind: 'nothing' }], successText: '壁に張りついて、ゆっくり渡った。' },
    ],
  },
  {
    id: 'tombTrap',
    title: '墓の罠',
    icon: 'trap',
    text: '宝の部屋の前の床に、不自然な模様がある。罠だろうか。',
    options: [
      {
        label: '罠を見破って進む',
        check: { stat: 'per', slots: 3, need: 2, purpose: 'mechanism' },
        success: [{ kind: 'gold', amount: 50 }, { kind: 'item', rarity: 'common', slot: 'consumable' }],
        fail: [{ kind: 'damage', amount: 5, all: true }],
        successText: '罠を外して、財宝を手に入れた！（50ゴールド）',
        failText: '罠が作動した！（全員 5ダメージ）',
      },
      { label: '見なかったことにする', success: [{ kind: 'nothing' }], successText: '宝には触れずに進んだ。' },
    ],
  },
  {
    id: 'hieroglyphWall',
    title: '壁画の文字',
    icon: 'stele',
    text: '壁いっぱいに、古い文字が刻まれている。王が永遠の命を求めた記録のようだ。',
    options: [
      {
        label: '文字を読み解く',
        check: { stat: 'int', slots: 3, need: 2, tag: 'arcane' },
        success: [{ kind: 'exp', amount: 25 }],
        fail: [{ kind: 'status', status: 'weak', amount: 2 }],
        successText: '王は、疫病から民を救うために永遠の命を求めたと分かった。（全員 経験値+25）',
        failText: '呪いの文字だった…。次の戦闘で弱体2。',
      },
      { label: '見なかったことにする', success: [{ kind: 'nothing' }], successText: '壁画には触れずに進んだ。' },
    ],
  },
  {
    id: 'undergroundSpring',
    title: '地下の泉',
    icon: 'spring',
    text: '暗がりの奥に、澄んだ泉が湧いている。',
    options: [
      {
        label: '泉の水を飲む',
        check: { stat: 'luk', slots: 2, need: 1 },
        success: [{ kind: 'heal', amount: 25, all: true }, { kind: 'gainFocus', amount: 1, all: true }],
        fail: [{ kind: 'status', status: 'poison', amount: 3 }],
        successText: '体の芯から力が湧いてくる！（全員 HP+25・フォーカス+1）',
        failText: '水に毒が混ざっていた…。次の戦闘で毒3。',
      },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '泉を後にした。' },
    ],
  },
  {
    id: 'rubbleChest',
    title: '瓦礫に埋もれた宝箱',
    icon: 'cart',
    text: '崩れた天井の瓦礫の下に、宝箱の角がのぞいている。',
    options: [
      {
        label: '瓦礫をどかして開ける',
        check: { stat: 'str', slots: 3, need: 2, tag: 'obstacle' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        fail: [{ kind: 'damage', amount: 5 }],
        successText: '宝箱の中から、装備が現れた！',
        failText: '瓦礫が崩れて、手を痛めた…。',
      },
      { label: '放っておく', success: [{ kind: 'nothing' }], successText: '宝箱には触れずに進んだ。' },
    ],
  },
  {
    id: 'ghostCaravan',
    title: '幽霊の隊商',
    icon: 'merchant',
    text: '砂の中から、半透明の商人が現れた。「千年ぶりの客だ。安くしておくよ」',
    options: [
      { label: '回復薬を買う（30G）', cost: 30, success: [{ kind: 'loseGold', amount: 30 }, { kind: 'item', rarity: 'common', slot: 'consumable' }], successText: '「毎度あり！」' },
      { label: '掘り出し物を買う（90G）', cost: 90, success: [{ kind: 'loseGold', amount: 90 }, { kind: 'item', rarity: 'rare', slot: 'equipment' }], successText: '「いい目をしてるね！」' },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '「また、千年後に」' },
    ],
  },
  // ----- ボスの手前の物語の部屋 -----
  {
    id: 'scorpionNest',
    title: '蠍の巣',
    icon: 'stele',
    text: '砂蠍王が、墓の奥で尾を揺らしている。「ここは王の墓だ。眠りを妨げる者は、砂になれ」',
    options: [
      { label: '武器を構えて進む', success: [{ kind: 'nothing' }], successText: '砂蠍王が尾を振り上げた。戦いが始まる！' },
      { label: '深呼吸して備える（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '乾いた空気の中で、心を落ち着けた。' },
    ],
  },
  {
    id: 'scribeDesk',
    title: '宰相の書斎',
    icon: 'stele',
    text: '影の宰相が書を綴っている。「王は民を救うために、禁じられた術を使った。私は、止められなかった」',
    options: [
      { label: '宰相に近づく', success: [{ kind: 'nothing' }], successText: '宰相の影が揺れた。戦いが始まる！' },
      { label: '書棚の本をめくる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '古い言葉が、頭を冴えさせた。' },
    ],
  },
  {
    id: 'guardianGate',
    title: '神殿の大扉',
    icon: 'stele',
    text: '大扉の前で、石の守護獣が目を開いた。「王の命により、誰も通さぬ。…たとえ、王が変わり果てても」',
    options: [
      { label: '武器を構えて進む', success: [{ kind: 'nothing' }], successText: '守護獣が吠えた。戦いが始まる！' },
      { label: '守護獣に語りかける（全員のHP+15）', success: [{ kind: 'heal', amount: 15, all: true }], successText: '守護獣の目が、一瞬だけ優しくなった。' },
    ],
  },
  {
    id: 'pharaohThrone',
    title: '黄金の玉座',
    icon: 'stele',
    text: '砂塵の王が玉座にいる。「民は皆、私の中で生きている。永遠に、苦しまずに」',
    options: [
      { label: '王に語りかける', success: [{ kind: 'nothing' }], successText: '王の瞳に、迷いが走った。「…それでも、私は」戦いが始まる！' },
      { label: '仲間と顔を見合わせる（全員のフォーカス+1）', success: [{ kind: 'gainFocus', amount: 1, all: true }], successText: '仲間と頷き合い、覚悟を決めた。' },
    ],
  },
];
