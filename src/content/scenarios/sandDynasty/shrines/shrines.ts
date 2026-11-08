// シナリオ4の祠（spec §8.4）。どれか1つを選ぶ。永続の加護は1人が持てる数に上限がある
import type { ShrineDef } from '../../../../types';

const heal = { label: '癒やしの祈り（全員のHP+30）', outcomes: [{ kind: 'heal' as const, amount: 30, all: true }] };
const focus = { label: '集中の祈り（全員のフォーカス+2）', outcomes: [{ kind: 'gainFocus' as const, amount: 2, all: true }] };

export const shrines: ShrineDef[] = [
  {
    id: 'shrineOfSun',
    name: '太陽の祠',
    text: '砂に半分埋もれた、金色の太陽の像がある。',
    options: [heal, focus, { label: '太陽の加護（永続: 力+5）', outcomes: [{ kind: 'stat', stat: 'str', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfWell',
    name: '井戸の祠',
    text: '枯れた井戸の底から、かすかに水の音がする。',
    options: [heal, focus, { label: '水の加護（永続: 体力+5）', outcomes: [{ kind: 'stat', stat: 'vit', amount: 5 }], permanent: true }],
  },
  {
    id: 'shrineOfScarab',
    name: '甲虫の祠',
    text: '石の甲虫が、砂の上で静かに光っている。',
    options: [heal, { label: '甲虫の祈り（命の灯火+1。祠の力を使い切る）', outcomes: [{ kind: 'lives', amount: 1 }] }],
  },
  {
    id: 'shrineOfStar',
    name: '星読みの祠',
    text: '夜空を指す石柱が、砂漠にぽつんと立っている。',
    options: [heal, focus, { label: '星の加護（永続: 感知+5）', outcomes: [{ kind: 'stat', stat: 'per', amount: 5 }], permanent: true }],
  },
];
