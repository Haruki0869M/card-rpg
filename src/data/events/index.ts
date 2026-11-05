// ダンジョンのイベント部屋
import type { EventDef } from '../../types';
import { createRegistry } from '../registry';

export const EVENTS = createRegistry<EventDef>('event', [
  {
    id: 'fallenTree',
    title: '倒れた巨木',
    icon: 'tree',
    text: '道を巨大な倒木がふさいでいる。その下に、古びた木箱の角が見える…。',
    options: [
      {
        label: '倒木を押しのける',
        check: { stat: 'str', slots: 3, need: 2, tag: 'obstacle' },
        success: [{ kind: 'item', rarity: 'rare', slot: 'equipment' }],
        fail: [{ kind: 'damage', amount: 6 }],
        successText: '倒木が転がり、木箱が姿を現した！',
        failText: '腕を痛めてしまった…。',
      },
      { label: '迂回して進む', success: [{ kind: 'nothing' }], successText: '遠回りして先へ進んだ。' },
    ],
  },
  {
    id: 'ancientStele',
    title: '古い石碑',
    icon: 'stele',
    text: '苔むした石碑に、古代文字がびっしりと刻まれている。かすかに魔力を感じる。',
    options: [
      {
        label: '文字を読み解く',
        check: { stat: 'int', slots: 3, need: 2, tag: 'arcane' },
        success: [{ kind: 'exp', amount: 25 }],
        fail: [{ kind: 'status', status: 'weak', amount: 2 }],
        successText: '古代の知恵が流れ込んでくる！（全員 経験値+25）',
        failText: '呪いの文字だった…。次の戦闘で弱体2。',
      },
      {
        label: '【古文書解読】封印を解く',
        requiresTag: 'arcane',
        success: [{ kind: 'item', rarity: 'epic' }],
        successText: '封印が解け、石碑の中から宝物が現れた！',
      },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '石碑には触れずに進んだ。' },
    ],
  },
  {
    id: 'mysticSpring',
    title: '妖しく光る泉',
    icon: 'spring',
    text: '青白く光る泉が湧いている。飲めば力が湧くか、それとも…。',
    options: [
      {
        label: '泉の水を飲む',
        check: { stat: 'luk', slots: 2, need: 1 },
        success: [{ kind: 'heal', amount: 25, all: true }, { kind: 'focus', amount: 1, all: true }],
        fail: [{ kind: 'status', status: 'poison', amount: 4 }],
        successText: '体の芯から力が湧いてくる！（全員 HP+25・フォーカス+1）',
        failText: '水に毒が混ざっていた…。次の戦闘で毒4。',
      },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '泉を後にした。' },
    ],
  },
  {
    id: 'trappedHall',
    title: '罠だらけの回廊',
    icon: 'trap',
    text: '床に不自然な継ぎ目がある。罠が仕掛けられているようだ。奥で何かが光っている。',
    options: [
      {
        label: '罠を見破りながら進む',
        check: { stat: 'per', slots: 3, need: 2 },
        success: [{ kind: 'gold', amount: 40 }, { kind: 'item', rarity: 'common', slot: 'consumable' }],
        fail: [{ kind: 'damage', amount: 5, all: true }],
        successText: '罠をすべて避け、奥の財宝を手に入れた！',
        failText: '罠が作動した！（全員 5ダメージ）',
      },
      {
        label: '一気に駆け抜ける',
        check: { stat: 'agi', slots: 2, need: 1 },
        success: [{ kind: 'nothing' }],
        fail: [{ kind: 'damage', amount: 8, all: true }],
        successText: '罠が作動する前に駆け抜けた！',
        failText: '逃げ遅れた！（全員 8ダメージ）',
      },
    ],
  },
  {
    id: 'wanderingMerchant',
    title: '迷子の行商人',
    icon: 'merchant',
    text: '「おや、こんな所で人に会うとは。何か買っていくかい？」',
    options: [
      { label: '回復薬を買う（30G）', cost: 30, success: [{ kind: 'loseGold', amount: 30 }, { kind: 'item', rarity: 'common', slot: 'consumable' }], successText: '「毎度あり！」' },
      { label: '掘り出し物を買う（90G）', cost: 90, success: [{ kind: 'loseGold', amount: 90 }, { kind: 'item', rarity: 'rare', slot: 'equipment' }], successText: '「お目が高い！」' },
      { label: '立ち去る', success: [{ kind: 'nothing' }], successText: '「またどこかで！」' },
    ],
  },
]);
