// シナリオ3の祠（spec §8.4）。どれか1つを選ぶ。永続の加護は1人が持てる数に上限がある
import type { ShrineDef } from '../../../../types';

const heal = { label: '癒やしの祈り（全員のHP+30）', outcomes: [{ kind: 'heal' as const, amount: 30, all: true }] };
const focus = { label: '集中の祈り（全員のフォーカス+2）', outcomes: [{ kind: 'gainFocus' as const, amount: 2, all: true }] };

export const shrines: ShrineDef[] = [
  {
    id: 'shrineOfTide',
    name: '潮騒の祠',
    text: '波に洗われる岩の上に、小さな貝殻の祠がある。',
    options: [heal, focus, { label: '潮騒の加護（永続: 素早さ+5）', outcomes: [{ kind: 'stat', stat: 'agi', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfAnchor',
    name: '錨の祠',
    text: '苔むした巨大な錨が、祀られている。',
    options: [heal, focus, { label: '錨の加護（永続: 体力+5）', outcomes: [{ kind: 'stat', stat: 'vit', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfLanternFish',
    name: '灯火の祠',
    text: '消えそうな小さな灯が、霧の中で揺れている。',
    options: [heal, { label: '灯火の祈り（命の灯火+1。祠の力を使い切る）', outcomes: [{ kind: 'lives', amount: 1 }] }],
  },
  {
    id: 'shrineOfNorthStar',
    name: '北極星の祠',
    text: '霧の切れ間から、一つだけ星が見える。',
    options: [heal, focus, { label: '星の加護（永続: 感知+5）', outcomes: [{ kind: 'stat', stat: 'per', amount: 5 }], permanent: true }],
  },
];
